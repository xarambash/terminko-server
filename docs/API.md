# API reference

All authenticated routes require the `Authorization: Bearer <token>` header.
All `tenants/:tenantId/...` routes verify that the caller's token `tenantId`
matches the URL `tenantId`.

## Health

- `GET /health`: database connectivity check

## Auth

- `POST /auth/register`: register an owner. Body: `tenantId`, `email`, `password`, `firstName`, `lastName`.
- `POST /auth/login`: login. Body: `tenantId` or `tenantSlug`, `email`, `password`. Returns `{ token, user }`. `user.profilePicture` is populated for staff (joined from their `Resource`), `null` for owners.

## Access matrix

| Route                                       | Guest | Staff    | Owner   |
| ------------------------------------------- | ----- | -------- | ------- |
| `GET` resources                             | ✓     | ✗        | ✓       |
| `POST` resources                            | ✗     | ✗        | ✓       |
| `GET` resource services                     | ✓     | ✗        | ✓       |
| `POST` / `PATCH` / `DELETE` resource services | ✗   | ✗        | ✓       |
| `GET` available slots                       | ✓     | ✓ (own)  | ✓       |
| `GET` working hours                         | ✗     | ✓ (own)  | ✓       |
| `POST` / `PATCH` / `DELETE` working hours   | ✗     | ✗        | ✓       |
| `GET` / `POST` / `DELETE` free days         | ✗     | ✗        | ✓       |
| Services (`GET` / `POST`)                   | ✗     | ✗        | ✓       |
| `GET` guests                                | ✗     | ✗        | ✓       |
| `GET` appointments by `guestId`             | ✓     | ✗        | ✗       |
| `GET` appointments by `resourceId` / `date` | ✗     | ✓ (own)  | ✓ (all) |
| `POST` appointments                         | ✓     | ✗        | ✗       |
| `PATCH` appointments/:id (cancel, auth)     | ✗     | ✓ (own)  | ✓ (all) |
| `PATCH` appointments/cancel-by-code (guest) | ✓     | ✗        | ✗       |

## Tenants

- `POST /tenants`: create tenant *(MVP: public, production: Super Admin only)*
- `GET /tenants/:slug`: get tenant by slug (public)

## Resources

- `GET /tenants/:tenantId/resources`: list resources (public, for guest booking)
- `POST /tenants/:tenantId/resources`: create resource (Owner only). Also creates a linked `User` (staff login) in the same transaction.

## Services

- `GET /tenants/:tenantId/services`: list services (Owner only)
- `POST /tenants/:tenantId/services`: create service (Owner only)

## Resource services

- `GET /tenants/:tenantId/resources/:resourceId/services`: list services assigned to a resource with prices (public)
- `POST /tenants/:tenantId/resources/:resourceId/services`: assign service (Owner). Body: `serviceId`, `price`, `durationOverride?`.
- `PATCH /tenants/:tenantId/resources/:resourceId/services/:resourceServiceId`: update `price?` and/or `durationOverride?`. Set `durationOverride` to `null` to revert to service default. At least one field is required.
- `DELETE /tenants/:tenantId/resources/:resourceId/services/:resourceServiceId`: unassign service (Owner)

## Available slots

- `GET /tenants/:tenantId/resources/:resourceId/available-slots?serviceId&date`
  - `date` is `YYYY-MM-DD`
  - Returns `[{ startAt, endAt }]` in ISO 8601
  - Guest & Owner can request any resource. Staff can request only their own resource.

## Working hours

- `GET /tenants/:tenantId/resources/:resourceId/working-hours`: Owner (any) or Staff (own)
- `POST`: Owner. Body: `dayOfWeek` (0 to 6), `startTime`, `endTime` (`HH:MM`). Multiple intervals per day allowed. Overlaps rejected with `409`.
- `PATCH /.../working-hours/:workingHourId`: Owner, same body as `POST`. Overlaps rejected with `409`.
- `DELETE /.../working-hours/:workingHourId`: Owner

## Free days

- `GET /tenants/:tenantId/resources/:resourceId/free-days`: Owner
- `POST`: Owner. Body: `start_date` (`YYYY-MM-DD`), `end_date?`, `reason?`. Overlapping ranges rejected with `409`.
- `DELETE /.../free-days/:freeDayId`: Owner

## Guests

- `GET /tenants/:tenantId/guests`: Owner only. Guests are created automatically when booking.

## Appointments

- `GET /tenants/:tenantId/appointments`
  - Guest: `?guestId=...` (no auth)
  - Staff / Owner: `?resourceId&date` (auth, Staff sees only their own resource)
- `POST /tenants/:tenantId/appointments`: create (public). Body: `resourceId`, `serviceId`, `guest: { name, email, phone }`, `startAt`, `endAt`, optional `priceAtBooking`, `notes`. Guest is created if the email is new for this tenant.
- `PATCH /tenants/:tenantId/appointments/:id`: cancel (authenticated). Owner cancels any, Staff cancels only their own resource. No body.
- `PATCH /tenants/:tenantId/appointments/cancel-by-code`: cancel by guest (no auth). Body: `{ "cancellationCode": "string" }`.
