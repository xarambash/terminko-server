import { prisma } from '../db.js';

export type CreateServiceInput = {
  tenantId: string;
  name: string;
  durationMinutes: number;
  description?: string | undefined;
  isActive?: boolean | undefined;
  sortOrder?: number | undefined;
};

export type UpdateServiceInput = {
  name?: string | undefined;
  durationMinutes?: number | undefined;
  description?: string | null | undefined;
  isActive?: boolean | undefined;
  sortOrder?: number | undefined;
};

type ServiceRecord = Awaited<ReturnType<typeof prisma.service.create>>;

export type UpdateServiceResult =
  | { status: 'not_found' }
  | { status: 'success'; service: ServiceRecord };

export type DeleteServiceResult =
  | { status: 'not_found' }
  | { status: 'has_future_appointments' }
  | { status: 'success'; service: ServiceRecord };

export async function createService(data: CreateServiceInput) {
  return prisma.service.create({
    data: {
      tenantId: data.tenantId,
      name: data.name,
      durationMinutes: data.durationMinutes,
      ...(data.description != null && { description: data.description }),
      isActive: data.isActive ?? true,
      sortOrder: data.sortOrder ?? 0,
    },
  });
}

export async function getServicesByTenantId(tenantId: string) {
  return prisma.service.findMany({
    where: { tenantId },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
}

export async function updateService(
  tenantId: string,
  serviceId: string,
  patch: UpdateServiceInput
): Promise<UpdateServiceResult> {
  const existing = await prisma.service.findFirst({
    where: { id: serviceId, tenantId },
    select: { id: true },
  });
  if (!existing) {
    return { status: 'not_found' };
  }

  const service = await prisma.service.update({
    where: { id: serviceId },
    data: {
      ...(patch.name !== undefined && { name: patch.name }),
      ...(patch.durationMinutes !== undefined && { durationMinutes: patch.durationMinutes }),
      ...(patch.description !== undefined && { description: patch.description }),
      ...(patch.isActive !== undefined && { isActive: patch.isActive }),
      ...(patch.sortOrder !== undefined && { sortOrder: patch.sortOrder }),
    },
  });

  return { status: 'success', service };
}

export async function deleteService(tenantId: string, serviceId: string): Promise<DeleteServiceResult> {
  const existing = await prisma.service.findFirst({
    where: { id: serviceId, tenantId },
    select: { id: true },
  });
  if (!existing) {
    return { status: 'not_found' };
  }

  const futureScheduled = await prisma.appointment.count({
    where: {
      tenantId,
      serviceId,
      status: 'scheduled',
      startAt: { gt: new Date() },
    },
  });
  if (futureScheduled > 0) {
    return { status: 'has_future_appointments' };
  }

  const service = await prisma.service.delete({
    where: { id: serviceId },
  });

  return { status: 'success', service };
}
