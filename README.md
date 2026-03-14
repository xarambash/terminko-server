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

### Tenants

- `POST /tenants` – create tenant
- `GET /tenants/:slug` – get tenant by slug

### Resources

- `GET /tenants/:tenantId/resources` – list resources (staff)
- `POST /tenants/:tenantId/resources` – create resource (creates Resource + User for staff login)

### Services

- `GET /tenants/:tenantId/services` – list services
- `POST /tenants/:tenantId/services` – create service

### Resource Services

- `GET /tenants/:tenantId/resources/:resourceId/services` – list services assigned to resource (with prices)
- `POST /tenants/:tenantId/resources/:resourceId/services` – assign service to resource (serviceId, price, durationOverride?)

### Resource Working Hours

- `GET /tenants/:tenantId/resources/:resourceId/working-hours` – list working hours for resource
- `POST /tenants/:tenantId/resources/:resourceId/working-hours` – add working hour (dayOfWeek 0–6, startTime, endTime as "HH:MM")

### Resource Free Days

- `GET /tenants/:tenantId/resources/:resourceId/free-days` – list free days for resource
- `POST /tenants/:tenantId/resources/:resourceId/free-days` – add free day (date as "YYYY-MM-DD", reason?)

### Guests

- `GET /tenants/:tenantId/guests` – list guests
- `POST /tenants/:tenantId/guests` – create guest (name, email, phone required; notes?)

### Appointments

- `GET /tenants/:tenantId/appointments` – list appointments (query: resourceId?, guestId?, date?)
- `POST /tenants/:tenantId/appointments` – create appointment (resourceId, serviceId, guestId, startAt, endAt; priceAtBooking?, notes?)

## Tech stack

- Node.js, Express, TypeScript
- Prisma, PostgreSQL
