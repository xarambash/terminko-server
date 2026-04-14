import { prisma } from '../db.js';

export type CreateResourceWorkingHourInput = {
  tenantId: string;
  resourceId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

export type UpdateResourceWorkingHourInput = CreateResourceWorkingHourInput & {
  workingHourId: string;
};

type WorkingHourMutationResult =
  | { status: 'resource_not_found' }
  | { status: 'working_hour_not_found' }
  | { status: 'overlap' }
  | { status: 'success'; workingHour: WorkingHourRecord };

type WorkingHourRecord = Awaited<ReturnType<typeof prisma.resourceWorkingHour.create>>;
type CreateWorkingHourResult =
  | { status: 'resource_not_found' }
  | { status: 'overlap' }
  | { status: 'success'; workingHour: WorkingHourRecord };
type DeleteWorkingHourResult =
  | { status: 'resource_not_found' }
  | { status: 'working_hour_not_found' }
  | { status: 'success'; workingHour: WorkingHourRecord };

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

async function getResource(resourceId: string, tenantId: string) {
  return prisma.resource.findFirst({
    where: { id: resourceId, tenantId },
    select: { id: true },
  });
}

async function hasOverlappingWorkingHour(input: {
  resourceId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  excludeWorkingHourId?: string;
}) {
  const newStart = timeToMinutes(input.startTime);
  const newEnd = timeToMinutes(input.endTime);

  const workingHours = await prisma.resourceWorkingHour.findMany({
    where: {
      resourceId: input.resourceId,
      dayOfWeek: input.dayOfWeek,
      ...(input.excludeWorkingHourId != null && { id: { not: input.excludeWorkingHourId } }),
    },
    select: {
      startTime: true,
      endTime: true,
    },
  });

  return workingHours.some((workingHour) => {
    const existingStart = timeToMinutes(workingHour.startTime);
    const existingEnd = timeToMinutes(workingHour.endTime);
    return newStart < existingEnd && newEnd > existingStart;
  });
}

export async function createResourceWorkingHour(
  data: CreateResourceWorkingHourInput
): Promise<CreateWorkingHourResult> {
  const resource = await getResource(data.resourceId, data.tenantId);
  if (!resource) {
    return { status: 'resource_not_found' };
  }

  const hasOverlap = await hasOverlappingWorkingHour(data);
  if (hasOverlap) {
    return { status: 'overlap' };
  }

  const workingHour = await prisma.resourceWorkingHour.create({
    data: {
      resourceId: data.resourceId,
      dayOfWeek: data.dayOfWeek,
      startTime: data.startTime,
      endTime: data.endTime,
    },
  });

  return { status: 'success', workingHour };
}

export async function getWorkingHoursByResourceId(
  resourceId: string,
  tenantId: string
) {
  const resource = await getResource(resourceId, tenantId);
  if (!resource) return null;

  return prisma.resourceWorkingHour.findMany({
    where: { resourceId },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  });
}

export async function updateResourceWorkingHour(
  data: UpdateResourceWorkingHourInput
): Promise<WorkingHourMutationResult> {
  const resource = await getResource(data.resourceId, data.tenantId);
  if (!resource) {
    return { status: 'resource_not_found' };
  }

  const existingWorkingHour = await prisma.resourceWorkingHour.findFirst({
    where: {
      id: data.workingHourId,
      resourceId: data.resourceId,
    },
  });

  if (!existingWorkingHour) {
    return { status: 'working_hour_not_found' };
  }

  const hasOverlap = await hasOverlappingWorkingHour({
    resourceId: data.resourceId,
    dayOfWeek: data.dayOfWeek,
    startTime: data.startTime,
    endTime: data.endTime,
    excludeWorkingHourId: data.workingHourId,
  });
  if (hasOverlap) {
    return { status: 'overlap' };
  }

  const workingHour = await prisma.resourceWorkingHour.update({
    where: { id: data.workingHourId },
    data: {
      dayOfWeek: data.dayOfWeek,
      startTime: data.startTime,
      endTime: data.endTime,
    },
  });

  return { status: 'success', workingHour };
}

export async function deleteResourceWorkingHour(input: {
  tenantId: string;
  resourceId: string;
  workingHourId: string;
}): Promise<DeleteWorkingHourResult> {
  const resource = await getResource(input.resourceId, input.tenantId);
  if (!resource) {
    return { status: 'resource_not_found' };
  }

  const existingWorkingHour = await prisma.resourceWorkingHour.findFirst({
    where: {
      id: input.workingHourId,
      resourceId: input.resourceId,
    },
  });

  if (!existingWorkingHour) {
    return { status: 'working_hour_not_found' };
  }

  const workingHour = await prisma.resourceWorkingHour.delete({
    where: { id: input.workingHourId },
  });

  return { status: 'success', workingHour };
}
