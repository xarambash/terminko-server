import { prisma } from '../db.js';

export type CreateGuestInput = {
  tenantId: string;
  name: string;
  email: string;
  phone: string;
  notes?: string | undefined;
};

export async function createGuest(data: CreateGuestInput) {
  return prisma.guest.create({
    data: {
      tenantId: data.tenantId,
      name: data.name,
      email: data.email,
      phone: data.phone,
      ...(data.notes != null && { notes: data.notes }),
    },
  });
}

export async function getGuestsByTenantId(tenantId: string) {
  return prisma.guest.findMany({
    where: { tenantId },
    orderBy: { name: 'asc' },
  });
}
