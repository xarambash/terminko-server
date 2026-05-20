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

type UpdateResourceServiceResult =
  | { status: 'resource_not_found' }
  | { status: 'not_found' }
  | { status: 'success'; data: Awaited<ReturnType<typeof prisma.resourceService.update>> };

export async function updateResourceService(input: {
  tenantId: string;
  resourceId: string;
  resourceServiceId: string;
  price?: number;
  durationOverride?: number | null;
}): Promise<UpdateResourceServiceResult> {
  const resource = await prisma.resource.findFirst({
    where: { id: input.resourceId, tenantId: input.tenantId },
    select: { id: true },
  });
  if (!resource) return { status: 'resource_not_found' };

  const existing = await prisma.resourceService.findFirst({
    where: { id: input.resourceServiceId, resourceId: input.resourceId },
  });
  if (!existing) return { status: 'not_found' };

  const data = await prisma.resourceService.update({
    where: { id: input.resourceServiceId },
    data: {
      ...(input.price !== undefined && { price: input.price }),
      ...(input.durationOverride !== undefined && { durationOverride: input.durationOverride }),
    },
    include: { service: true },
  });

  return { status: 'success', data };
}

type DeleteResourceServiceResult =
  | { status: 'resource_not_found' }
  | { status: 'not_found' }
  | { status: 'success' };

export async function deleteResourceService(input: {
  tenantId: string;
  resourceId: string;
  resourceServiceId: string;
}): Promise<DeleteResourceServiceResult> {
  const resource = await prisma.resource.findFirst({
    where: { id: input.resourceId, tenantId: input.tenantId },
    select: { id: true },
  });
  if (!resource) return { status: 'resource_not_found' };

  const existing = await prisma.resourceService.findFirst({
    where: { id: input.resourceServiceId, resourceId: input.resourceId },
  });
  if (!existing) return { status: 'not_found' };

  await prisma.resourceService.delete({ where: { id: input.resourceServiceId } });

  return { status: 'success' };
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
