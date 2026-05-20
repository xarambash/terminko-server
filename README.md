# terminko-server

Backend API for Terminko – a scheduling app for small businesses (salons, barbers, dentists). Supports multiple tenants with isolated data. Serves the guest mobile app (booking flow) and the owner/staff web app (management).

**Users:** Guests book without login; Owners and Staff log in to manage appointments, resources, and services.

## Requirements

- Node.js 18+
- npm

## Installation

```bash
npm install
```

## Scripts

- `npm run dev` – development with auto-reload (port 5000)
- `npm run build` – compile TypeScript to `dist/`
- `npm run start` – run production build (run `npm run build` first)

## API

### Health

- `GET /health` – health check (database connection)

### Auth

- `POST /auth/register` – register owner (body: tenantId, email, password, firstName, lastName)
- `POST /auth/login` – login (body: tenantId or tenantSlug, email, password). Returns `{ token, user }`.

Protected routes require `Authorization: Bearer <token>` header.

### Access by role

| Route | Guest | Staff | Owner |
|-------|-------|-------|-------|
| GET resources | ✓ | — | ✓ |
| POST resources | — | — | ✓ |
| GET resource services | ✓ | — | ✓ |
| POST resource services | — | — | ✓ |
| GET available slots | ✓ | ✓ (own) | ✓ |
| GET working hours | — | ✓ (own) | ✓ |
| POST working hours, Free days | — | — | ✓ |
| Services | — | — | ✓ |
| GET guests | — | — | ✓ |
| GET appointments (guestId) | ✓ | — | — |
| GET appointments (resourceId/date) | — | ✓ (own) | ✓ (all) |
| POST appointments | ✓ | — | — |
| PATCH appointments/:id (cancel authenticated) | — | ✓ (own) | ✓ (all) |
| PATCH appointments/cancel-by-code (guest) | ✓ | — | — |

### Tenants

- `POST /tenants` – create tenant (MVP: public; production: Super Admin only)
- `GET /tenants/:slug` – get tenant by slug (public)

### Resources

- `GET /tenants/:tenantId/resources` – list resources (public, for guest booking)
- `POST /tenants/:tenantId/resources` – create resource (Owner only; creates Resource + User for staff login)

### Services

- `GET /tenants/:tenantId/services` – list services (Owner only)
- `POST /tenants/:tenantId/services` – create service (Owner only)

### Resource Services

- `GET /tenants/:tenantId/resources/:resourceId/services` – list services assigned to resource with prices (public, for guest booking)
- `POST /tenants/:tenantId/resources/:resourceId/services` – assign service to resource (Owner only; body: serviceId, price, durationOverride?)
- `PATCH /tenants/:tenantId/resources/:resourceId/services/:resourceServiceId` – update price or duration override (Owner only; body: `price?`, `durationOverride?` — set `durationOverride` to `null` to revert to service default; at least one field required)
- `DELETE /tenants/:tenantId/resources/:resourceId/services/:resourceServiceId` – unassign service from resource (Owner only)

### Available Slots

- `GET /tenants/:tenantId/resources/:resourceId/available-slots` – list available time slots for booking. Guest/Owner: any resource. Staff: own resource only. Query: `serviceId`, `date` (YYYY-MM-DD). Returns `[{ startAt, endAt }]` (ISO 8601).

### Resource Working Hours

- `GET /tenants/:tenantId/resources/:resourceId/working-hours` – list working hours (Owner: any resource; Staff: own resource only)
- `POST /tenants/:tenantId/resources/:resourceId/working-hours` – add working hour (Owner only; body: dayOfWeek 0–6, startTime, endTime as "HH:MM"; multiple intervals per day allowed, overlaps rejected with `409`)
- `PATCH /tenants/:tenantId/resources/:resourceId/working-hours/:workingHourId` – update working hour interval (Owner only; same body as POST; overlaps rejected with `409`)
- `DELETE /tenants/:tenantId/resources/:resourceId/working-hours/:workingHourId` – delete working hour interval (Owner only)

### Resource Free Days

- `GET /tenants/:tenantId/resources/:resourceId/free-days` – list free days (Owner only)
- `POST /tenants/:tenantId/resources/:resourceId/free-days` – add free day or date range (Owner only; body: `start_date` "YYYY-MM-DD", `end_date?` "YYYY-MM-DD", `reason?`; overlapping ranges rejected with `409`)
- `DELETE /tenants/:tenantId/resources/:resourceId/free-days/:freeDayId` – delete free day (Owner only)

### Guests

- `GET /tenants/:tenantId/guests` – list guests (Owner only). Guests are created automatically when booking (see POST appointments).

### Appointments

- `GET /tenants/:tenantId/appointments` – list appointments. Guest: `?guestId=` (no auth). Staff/Owner: `?resourceId?&date?` (auth; Staff sees only own resource).
- `POST /tenants/:tenantId/appointments` – create appointment (public). Body: `resourceId`, `serviceId`, `guest: { name, email, phone }`, `startAt`, `endAt`; optional: `priceAtBooking`, `notes`. Guest is created if email does not exist in tenant.
- `PATCH /tenants/:tenantId/appointments/:id` – cancel appointment (authenticated). Owner: cancels any appointment. Staff: cancels own resource's appointments only. No body required.
- `PATCH /tenants/:tenantId/appointments/cancel-by-code` – cancel appointment (guest, no auth). Body: `{ "cancellationCode": "string" }`.

## Environment

- `DATABASE_URL` – PostgreSQL connection string
- `JWT_SECRET` – secret for JWT signing (required in production)
- `PORT` – server port (default 5000)

## Tech stack

- Node.js, Express, TypeScript
- Prisma, PostgreSQL
