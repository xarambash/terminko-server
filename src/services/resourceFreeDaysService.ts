import { prisma } from '../db.js';

export type CreateResourceFreeDayInput = {
  tenantId: string;
  resourceId: string;
  startDate: Date;
  endDate: Date;
  reason?: string | undefined;
};

type CreateFreeDayResult =
  | { status: 'resource_not_found' }
  | { status: 'overlap'; message: string }
  | { status: 'success'; freeDay: Awaited<ReturnType<typeof prisma.resourceFreeDay.create>> };

type DeleteFreeDayResult =
  | { status: 'resource_not_found' }
  | { status: 'free_day_not_found' }
  | { status: 'success' };

export async function createResourceFreeDay(
  data: CreateResourceFreeDayInput
): Promise<CreateFreeDayResult> {
  const resource = await prisma.resource.findFirst({
    where: { id: data.resourceId, tenantId: data.tenantId },
    select: { id: true },
  });
  if (!resource) return { status: 'resource_not_found' };

  const overlap = await prisma.resourceFreeDay.findFirst({
    where: {
      resourceId: data.resourceId,
      startDate: { lte: data.endDate },
      endDate: { gte: data.startDate },
    },
  });
  if (overlap) {
    return {
      status: 'overlap',
      message: `Overlaps with existing free day range ${overlap.startDate.toISOString().slice(0, 10)} – ${overlap.endDate.toISOString().slice(0, 10)}`,
    };
  }

  const freeDay = await prisma.resourceFreeDay.create({
    data: {
      resourceId: data.resourceId,
      startDate: data.startDate,
      endDate: data.endDate,
      ...(data.reason != null && { reason: data.reason }),
    },
  });

  return { status: 'success', freeDay };
}

export async function getFreeDaysByResourceId(
  resourceId: string,
  tenantId: string
) {
  const resource = await prisma.resource.findFirst({
    where: { id: resourceId, tenantId },
    select: { id: true },
  });
  if (!resource) return null;

  return prisma.resourceFreeDay.findMany({
    where: { resourceId },
    orderBy: { startDate: 'asc' },
    select: { id: true, startDate: true, endDate: true, reason: true, createdAt: true },
  });
}

export async function deleteResourceFreeDay(input: {
  tenantId: string;
  resourceId: string;
  freeDayId: string;
}): Promise<DeleteFreeDayResult> {
  const resource = await prisma.resource.findFirst({
    where: { id: input.resourceId, tenantId: input.tenantId },
    select: { id: true },
  });
  if (!resource) return { status: 'resource_not_found' };

  const existing = await prisma.resourceFreeDay.findFirst({
    where: { id: input.freeDayId, resourceId: input.resourceId },
  });
  if (!existing) return { status: 'free_day_not_found' };

  await prisma.resourceFreeDay.delete({ where: { id: input.freeDayId } });

  return { status: 'success' };
}
