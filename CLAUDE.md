# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # start dev server with auto-reload (port 5000)
npm run build    # compile TypeScript to dist/
npm run start    # run compiled output (build first)
```

No test runner is configured — `npm test` exits with an error.

After schema changes:
```bash
npx prisma migrate dev   # apply migration and regenerate client
npx prisma generate      # regenerate client only (no migration)
```

The Prisma client is generated into `src/generated/prisma/` (non-standard output path set in `schema.prisma`).

## Environment Variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (Prisma) |
| `DIRECT_URL` | Direct PostgreSQL URL (bypasses pooler, used by Prisma migrations) |
| `JWT_SECRET` | JWT signing secret (defaults to `dev-secret-change-in-production`) |
| `PORT` | Server port (default 5000) |

## Architecture

**Three-layer structure:** `routes/` → `controllers/` → `services/`

- **Routes** (`src/routes/`) — mount handlers, no logic
- **Controllers** (`src/controllers/`) — parse/validate request, call service, send response
- **Services** (`src/services/`) — all business logic and Prisma queries; return data or `null` on not-found/conflict

The single Prisma client instance lives in `src/db.ts` and is imported everywhere as `{ prisma }`.

### Multi-tenancy

Every resource (Resource, Service, Guest, Appointment, etc.) is scoped to a `Tenant` by `tenantId`. All routes under `/tenants/:tenantId/...` require `tenantId` to be present via `requireTenantIdInParams`, and authenticated users have their `tenantId` compared against the URL parameter by `requireTenantAccess` / `confirmTenantIfAuthenticated` to prevent cross-tenant access.

### Auth & Roles

JWT tokens carry `{ userId, tenantId, resourceId, role }` (see `src/types/auth.ts`). Three roles:

- **Guest** — unauthenticated; can book appointments and cancel their own using `guestId`
- **Staff** — authenticated; scoped to one `Resource` via `resourceId` in the token
- **Owner** — authenticated; full access within their tenant

Middleware in `src/middleware/authMiddleware.ts` is composed in `src/index.ts` per route group. Key middleware:

| Middleware | Effect |
|---|---|
| `optionalAuth` | Decodes token if present; never blocks |
| `requireAuth` | Blocks if no valid token |
| `requireTenantAccess` | Blocks if token `tenantId` ≠ URL `tenantId` |
| `requireOwner` | Blocks if role ≠ `owner` |
| `requireOwnerPermissionToPost` | GET is public; mutations require owner auth |
| `requireOwnerOrStaffOwnResource` | GET allows staff on own resource; mutations require owner |
| `restrictStaffToTheirResource` | Staff can only access their own resource; guests and owners pass through |

### Available Slots Algorithm

`src/services/availableSlotsService.ts` computes free time slots by:
1. Fetching the resource's working hours for the requested day-of-week (multiple intervals allowed per day, e.g. 09:00–12:00 and 14:00–18:00)
2. Returning `[]` early if the day is a free day
3. Stepping through each working interval in `durationMinutes` increments (using `durationOverride` from `ResourceService` if set, otherwise `Service.durationMinutes`)
4. Filtering out slots that overlap with existing `scheduled` appointments

### Resource Creation

Creating a resource (`POST /tenants/:tenantId/resources`) also creates a `User` (staff login) for that resource in the same transaction — the User is linked to the Resource via `resourceId`.
