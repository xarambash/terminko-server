import { prisma } from '../db.js';

/** Clock-aligned start interval. Service duration is separate and can be any length. */
export const SLOT_START_STEP_MINUTES = 30;

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

export type WorkingInterval = {
  startTime: string;
  endTime: string;
};

export type BusyInterval = {
  startAt: Date;
  endAt: Date;
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

function alignUpToStep(minutes: number, step: number): number {
  const remainder = minutes % step;
  return remainder === 0 ? minutes : minutes + (step - remainder);
}

/**
 * Offers every clock-aligned start (09:00, 09:30, …) where the full service
 * duration fits in a working interval and does not overlap a scheduled appointment.
 * Starts that have already passed are omitted.
 */
export function buildAvailableSlots(input: {
  date: string;
  durationMinutes: number;
  workingHours: WorkingInterval[];
  appointments: BusyInterval[];
  now?: Date;
}): TimeSlot[] {
  const { date, durationMinutes, workingHours, appointments } = input;
  const now = input.now ?? new Date();

  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) return [];

  const slotsByStart = new Map<string, TimeSlot>();

  for (const wh of workingHours) {
    const intervalStart = parseTimeToMinutes(wh.startTime);
    const intervalEnd = parseTimeToMinutes(wh.endTime);
    if (intervalEnd <= intervalStart) continue;

    for (
      let currentMinutes = alignUpToStep(intervalStart, SLOT_START_STEP_MINUTES);
      currentMinutes + durationMinutes <= intervalEnd;
      currentMinutes += SLOT_START_STEP_MINUTES
    ) {
      const slotStart = createDateFromDateAndMinutes(date, currentMinutes);
      const slotEnd = createDateFromDateAndMinutes(date, currentMinutes + durationMinutes);

      if (slotStart.getTime() < now.getTime()) continue;

      const overlaps = appointments.some((appointment) =>
        slotsOverlap(slotStart, slotEnd, appointment.startAt, appointment.endAt)
      );
      if (overlaps) continue;

      const startAt = slotStart.toISOString();
      if (!slotsByStart.has(startAt)) {
        slotsByStart.set(startAt, { startAt, endAt: slotEnd.toISOString() });
      }
    }
  }

  return [...slotsByStart.values()].sort((a, b) => a.startAt.localeCompare(b.startAt));
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
          startDate: { lte: dayStart },
          endDate: { gte: dayStart },
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

  return buildAvailableSlots({
    date: data.date,
    durationMinutes,
    workingHours: relevantWorkingHours,
    appointments,
  });
}
