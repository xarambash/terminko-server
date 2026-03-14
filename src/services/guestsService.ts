import { prisma } from '../db.js';

export async function getGuestsByTenantId(tenantId: string) {
  return prisma.guest.findMany({
    where: { tenantId },
    orderBy: { name: 'asc' },
  });
}

export type FindOrCreateGuestInput = {
  tenantId: string;
  name: string;
  email: string;
  phone: string;
};

export async function findOrCreateGuest(data: FindOrCreateGuestInput) {
  const existing = await prisma.guest.findFirst({
    where: { tenantId: data.tenantId, email: data.email },
  });
  if (existing) return existing;
  return prisma.guest.create({
    data: {
      tenantId: data.tenantId,
      name: data.name,
      email: data.email,
      phone: data.phone,
    },
  });
}
