import { prisma } from '../db.js';

export type GetAvailableSlotsInput = {
  tenantId: string;
  resourceId: string;
  serviceId: string;
  date: string; // YYYY-MM-DD
};

export type TimeSlot = {
  startAt: string; // ISO 8601
  endAt: string; // ISO 8601
};

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function createDateFromDateAndMinutes(dateStr: string, minutesFromMidnight: number): Date {
  const d = new Date(dateStr + 'T00:00:00');
  d.setMinutes(d.getMinutes() + minutesFromMidnight);
  return d;
}

function slotsOverlap(
  slotStart: Date,
  slotEnd: Date,
  appointmentStart: Date,
  appointmentEnd: Date
): boolean {
  return slotStart < appointmentEnd && slotEnd > appointmentStart;
}

export async function getAvailableSlots(
  data: GetAvailableSlotsInput
): Promise<TimeSlot[] | null> {
  const dayStart = new Date(data.date + 'T00:00:00');
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const [resource, resourceService, workingHours, freeDays, appointments] =
    await Promise.all([
      prisma.resource.findFirst({
        where: { id: data.resourceId, tenantId: data.tenantId },
        select: { id: true },
      }),
      prisma.resourceService.findFirst({
        where: {
          resourceId: data.resourceId,
          serviceId: data.serviceId,
          isActive: true,
        },
        include: { service: true },
      }),
      prisma.resourceWorkingHour.findMany({
        where: { resourceId: data.resourceId },
      }),
      prisma.resourceFreeDay.findFirst({
        where: {
          resourceId: data.resourceId,
          date: dayStart,
        },
      }),
      prisma.appointment.findMany({
        where: {
          resourceId: data.resourceId,
          status: 'scheduled',
          startAt: { lt: dayEnd },
          endAt: { gt: dayStart },
        },
        select: { startAt: true, endAt: true },
      }),
    ]);

  if (!resource) return null;
  if (!resourceService) return null;
  if (freeDays) return [];

  const durationMinutes =
    resourceService.durationOverride ?? resourceService.service.durationMinutes;

  const dayOfWeek = new Date(data.date + 'T12:00:00').getDay();
  const relevantWorkingHours = workingHours.filter((wh) => wh.dayOfWeek === dayOfWeek);

  if (relevantWorkingHours.length === 0) return [];

  const slots: TimeSlot[] = [];

  // A resource may have multiple intervals per day (e.g. 09:00–12:00 and 14:00–18:00 with a break). Each wh is one such interval.
  for (const wh of relevantWorkingHours) {
    const startMinutes = parseTimeToMinutes(wh.startTime);
    const endMinutes = parseTimeToMinutes(wh.endTime);

    let currentMinutes = startMinutes;

    while (currentMinutes + durationMinutes <= endMinutes) {
      // On first iteration, slotStart equals the resource's start time for this working interval (e.g. 09:00).
      const slotStart = createDateFromDateAndMinutes(data.date, currentMinutes);
      const slotEnd = createDateFromDateAndMinutes(
        data.date,
        currentMinutes + durationMinutes
      );

      const overlaps = appointments.some((a) =>
        slotsOverlap(slotStart, slotEnd, a.startAt, a.endAt)
      );

      if (!overlaps) {
        slots.push({
          startAt: slotStart.toISOString(),
          endAt: slotEnd.toISOString(),
        });
      }

      currentMinutes += durationMinutes;
    }
  }

  slots.sort((a, b) => a.startAt.localeCompare(b.startAt));

  return slots;
}
