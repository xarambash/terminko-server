import bcrypt from 'bcryptjs';
import { prisma } from '../db.js';

export type CreateResourceInput = {
  tenantId: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  profilePicture?: string | undefined;
  phone?: string | undefined;
  isActive?: boolean | undefined;
  displayOrder?: number | undefined;
};

export async function createResource(data: CreateResourceInput) {
  const passwordHash = await bcrypt.hash(data.password, 10);

  return prisma.$transaction(async (tx) => {
    const resource = await tx.resource.create({
      data: {
        tenantId: data.tenantId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        ...(data.profilePicture != null && { profilePicture: data.profilePicture }),
        ...(data.phone != null && { phone: data.phone }),
        isActive: data.isActive ?? true,
        displayOrder: data.displayOrder ?? 0,
      },
    });

    await tx.user.create({
      data: {
        tenantId: data.tenantId,
        resourceId: resource.id,
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        role: 'staff',
      },
    });

    return resource;
  });
}

export async function getResourcesByTenantId(tenantId: string) {
  return prisma.resource.findMany({
    where: { tenantId },
    orderBy: [{ displayOrder: 'asc' }, { lastName: 'asc' }],
  });
}
