# terminko-server

Backend server for Terminko – appointment booking (hair salon, nail salon, etc.). Communicates with terminko_db and serves terminko-mobile and terminko-manager.

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

### Tenants

- `POST /tenants` – create tenant
- `GET /tenants/:slug` – get tenant by slug

### Resources (auth required; POST requires owner)

- `GET /tenants/:tenantId/resources` – list resources
- `POST /tenants/:tenantId/resources` – create resource (creates Resource + User for staff login)

### Services (auth required)

- `GET /tenants/:tenantId/services` – list services
- `POST /tenants/:tenantId/services` – create service

### Resource Services (auth required; owner or own resource)

- `GET /tenants/:tenantId/resources/:resourceId/services` – list services assigned to resource (with prices)
- `POST /tenants/:tenantId/resources/:resourceId/services` – assign service to resource (serviceId, price, durationOverride?)

### Resource Working Hours (auth required; owner or own resource)

- `GET /tenants/:tenantId/resources/:resourceId/working-hours` – list working hours for resource
- `POST /tenants/:tenantId/resources/:resourceId/working-hours` – add working hour (dayOfWeek 0–6, startTime, endTime as "HH:MM")

### Resource Free Days (auth required; owner or own resource)

- `GET /tenants/:tenantId/resources/:resourceId/free-days` – list free days for resource
- `POST /tenants/:tenantId/resources/:resourceId/free-days` – add free day (date as "YYYY-MM-DD", reason?)

### Guests (auth required)

- `GET /tenants/:tenantId/guests` – list guests
- `POST /tenants/:tenantId/guests` – create guest (name, email, phone required; notes?)

### Appointments

- `GET /tenants/:tenantId/appointments` – list appointments (query: resourceId?, guestId?, date?). Guest uses guestId only (no auth). Staff/owner use resourceId/date (auth required; staff sees only own resource).
- `POST /tenants/:tenantId/appointments` – create appointment (resourceId, serviceId, guestId, startAt, endAt; priceAtBooking?, notes?). Public (guest books).

## Environment

- `DATABASE_URL` – PostgreSQL connection string
- `JWT_SECRET` – secret for JWT signing (required in production)
- `PORT` – server port (default 5000)

## Tech stack

- Node.js, Express, TypeScript
- Prisma, PostgreSQL
