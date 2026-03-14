import { prisma } from '../db.js';
import { findOrCreateGuest } from './guestsService.js';
import type { GetAppointmentsFilters } from '../types/appointments.js';

export type CreateAppointmentInput = {
  tenantId: string;
  resourceId: string;
  serviceId: string;
  guest: { name: string; email: string; phone: string };
  startAt: Date;
  endAt: Date;
  priceAtBooking?: number | undefined;
  notes?: string | undefined;
};

export async function createAppointment(data: CreateAppointmentInput) {
  const [resource, service, resourceService] = await Promise.all([
    prisma.resource.findUnique({ where: { id: data.resourceId }, select: { tenantId: true } }),
    prisma.service.findUnique({ where: { id: data.serviceId }, select: { tenantId: true } }),
    prisma.resourceService.findFirst({
      where: {
        resourceId: data.resourceId,
        serviceId: data.serviceId,
        isActive: true,
      },
      select: { price: true },
    }),
  ]);

  if (!resource || resource.tenantId !== data.tenantId) return null;
  if (!service || service.tenantId !== data.tenantId) return null;
  if (!resourceService) return null;

  const guest = await findOrCreateGuest({
    tenantId: data.tenantId,
    name: data.guest.name,
    email: data.guest.email,
    phone: data.guest.phone,
  });

  const overlapping = await prisma.appointment.findFirst({
    where: {
      resourceId: data.resourceId,
      status: 'scheduled',
      startAt: { lt: data.endAt },
      endAt: { gt: data.startAt },
    },
  });
  if (overlapping) return null;

  const price = data.priceAtBooking ?? Number(resourceService.price);

  return prisma.appointment.create({
    data: {
      tenantId: data.tenantId,
      resourceId: data.resourceId,
      serviceId: data.serviceId,
      guestId: guest.id,
      startAt: data.startAt,
      endAt: data.endAt,
      status: 'scheduled',
      priceAtBooking: price,
      ...(data.notes != null && { notes: data.notes }),
    },
    include: {
      resource: { select: { id: true, firstName: true, lastName: true } },
      service: { select: { id: true, name: true, durationMinutes: true } },
      guest: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function getAppointments(filters: GetAppointmentsFilters) {
  const where: Record<string, unknown> = { tenantId: filters.tenantId };

  if (filters.resourceId) where.resourceId = filters.resourceId;
  if (filters.guestId) where.guestId = filters.guestId;

  if (filters.date) {
    const date = new Date(filters.date);
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    where.startAt = { gte: date, lt: nextDay };
  }

  return prisma.appointment.findMany({
    where,
    include: {
      resource: { select: { id: true, firstName: true, lastName: true } },
      service: { select: { id: true, name: true, durationMinutes: true } },
      guest: { select: { id: true, name: true, email: true } },
    },
    orderBy: { startAt: 'asc' },
  });
}
