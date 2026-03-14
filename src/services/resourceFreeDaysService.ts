import { prisma } from '../db.js';

export type CreateResourceFreeDayInput = {
  tenantId: string;
  resourceId: string;
  date: Date;
  reason?: string | undefined;
};

export async function createResourceFreeDay(data: CreateResourceFreeDayInput) {
  const resource = await prisma.resource.findFirst({
    where: { id: data.resourceId, tenantId: data.tenantId },
    select: { id: true },
  });
  if (!resource) return null;

  return prisma.resourceFreeDay.create({
    data: {
      resourceId: data.resourceId,
      date: data.date,
      ...(data.reason != null && { reason: data.reason }),
    },
  });
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
    orderBy: { date: 'asc' },
  });
}
