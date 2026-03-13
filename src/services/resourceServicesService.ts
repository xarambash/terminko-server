import { prisma } from '../db.js';

export type CreateResourceServiceInput = {
  tenantId: string;
  resourceId: string;
  serviceId: string;
  price: number;
  durationOverride?: number | undefined;
  isActive?: boolean | undefined;
};

export async function createResourceService(data: CreateResourceServiceInput) {
  const [resource, service] = await Promise.all([
    prisma.resource.findUnique({ where: { id: data.resourceId }, select: { tenantId: true } }),
    prisma.service.findUnique({ where: { id: data.serviceId }, select: { tenantId: true } }),
  ]);

  if (!resource || resource.tenantId !== data.tenantId) {
    return null;
  }
  if (!service || service.tenantId !== data.tenantId) {
    return null;
  }

  return prisma.resourceService.create({
    data: {
      resourceId: data.resourceId,
      serviceId: data.serviceId,
      price: data.price,
      ...(data.durationOverride != null && { durationOverride: data.durationOverride }),
      isActive: data.isActive ?? true,
    },
    include: {
      service: true,
    },
  });
}

export async function getResourceServicesByResourceId(
  resourceId: string,
  tenantId: string
) {
  const resource = await prisma.resource.findFirst({
    where: { id: resourceId, tenantId },
    select: { id: true },
  });
  if (!resource) return null;

  return prisma.resourceService.findMany({
    where: { resourceId },
    include: {
      service: true,
    },
    orderBy: { service: { sortOrder: 'asc' } },
  });
}
