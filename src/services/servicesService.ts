import { prisma } from '../db.js';

export type CreateServiceInput = {
  tenantId: string;
  name: string;
  durationMinutes: number;
  description?: string | undefined;
  isActive?: boolean | undefined;
  sortOrder?: number | undefined;
};

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
