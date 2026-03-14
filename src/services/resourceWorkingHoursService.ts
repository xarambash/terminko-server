import { prisma } from '../db.js';

export type CreateResourceWorkingHourInput = {
  tenantId: string;
  resourceId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

export async function createResourceWorkingHour(data: CreateResourceWorkingHourInput) {
  const resource = await prisma.resource.findFirst({
    where: { id: data.resourceId, tenantId: data.tenantId },
    select: { id: true },
  });
  if (!resource) return null;

  return prisma.resourceWorkingHour.create({
    data: {
      resourceId: data.resourceId,
      dayOfWeek: data.dayOfWeek,
      startTime: data.startTime,
      endTime: data.endTime,
    },
  });
}

export async function getWorkingHoursByResourceId(
  resourceId: string,
  tenantId: string
) {
  const resource = await prisma.resource.findFirst({
    where: { id: resourceId, tenantId },
    select: { id: true },
  });
  if (!resource) return null;

  return prisma.resourceWorkingHour.findMany({
    where: { resourceId },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  });
}
