import bcrypt from 'bcryptjs';
import { prisma } from '../db.js';
import { getSupabase, PROFILE_PICTURES_BUCKET } from '../utils/supabase.js';

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

export type UpdateResourceInput = {
  firstName?: string | undefined;
  lastName?: string | undefined;
  email?: string | undefined;
  phone?: string | null | undefined;
  isActive?: boolean | undefined;
};

export type UpdateResourceResult =
  | { status: 'not_found' }
  | { status: 'success'; resource: ResourceRecord };

export async function updateResource(
  tenantId: string,
  resourceId: string,
  patch: UpdateResourceInput
): Promise<UpdateResourceResult> {
  const existing = await prisma.resource.findFirst({
    where: { id: resourceId, tenantId },
    select: { id: true },
  });
  if (!existing) {
    return { status: 'not_found' };
  }

  const resource = await prisma.resource.update({
    where: { id: resourceId },
    data: {
      ...(patch.firstName !== undefined && { firstName: patch.firstName }),
      ...(patch.lastName !== undefined && { lastName: patch.lastName }),
      ...(patch.email !== undefined && { email: patch.email }),
      ...(patch.phone !== undefined && { phone: patch.phone }),
      ...(patch.isActive !== undefined && { isActive: patch.isActive }),
    },
  });

  return { status: 'success', resource };
}

export type UploadResourcePhotoResult =
  | { status: 'not_found' }
  | { status: 'storage_error'; message: string }
  | { status: 'success'; resource: ResourceRecord };

export async function uploadResourcePhoto(
  tenantId: string,
  resourceId: string,
  fileBuffer: Buffer,
  mimeType: string
): Promise<UploadResourcePhotoResult> {
  const existing = await prisma.resource.findFirst({
    where: { id: resourceId, tenantId },
    select: { id: true },
  });
  if (!existing) {
    return { status: 'not_found' };
  }

  const supabase = getSupabase();
  const storagePath = `${tenantId}/${resourceId}`;
  const { error: uploadError } = await supabase.storage
    .from(PROFILE_PICTURES_BUCKET)
    .upload(storagePath, fileBuffer, { contentType: mimeType, upsert: true });

  if (uploadError) {
    return { status: 'storage_error', message: uploadError.message };
  }

  const { data: urlData } = supabase.storage
    .from(PROFILE_PICTURES_BUCKET)
    .getPublicUrl(storagePath);

  const resource = await prisma.resource.update({
    where: { id: resourceId },
    data: { profilePicture: urlData.publicUrl },
  });

  return { status: 'success', resource };
}

type ResourceRecord = Awaited<ReturnType<typeof prisma.resource.create>>;

export type DeleteResourceResult =
  | { status: 'not_found' }
  | { status: 'has_future_appointments' }
  | { status: 'success'; resource: ResourceRecord };

export async function deleteResource(tenantId: string, resourceId: string): Promise<DeleteResourceResult> {
  const existing = await prisma.resource.findFirst({
    where: { id: resourceId, tenantId },
    select: { id: true },
  });
  if (!existing) {
    return { status: 'not_found' };
  }

  const futureScheduled = await prisma.appointment.count({
    where: {
      tenantId,
      resourceId,
      status: 'scheduled',
      startAt: { gt: new Date() },
    },
  });
  if (futureScheduled > 0) {
    return { status: 'has_future_appointments' };
  }

  const resource = await prisma.resource.delete({
    where: { id: resourceId },
  });

  return { status: 'success', resource };
}
