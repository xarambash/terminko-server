import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db.js';
import type { JwtPayload } from '../types/auth.js';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production';
const JWT_EXPIRES_IN = '7d';

export type RegisterOwnerInput = {
  tenantId: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
};

export async function registerOwner(data: RegisterOwnerInput) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: data.tenantId },
  });
  if (!tenant) return null;

  const existing = await prisma.user.findFirst({
    where: {
      tenantId: data.tenantId,
      email: data.email,
    },
  });
  if (existing) return null;

  const passwordHash = await bcrypt.hash(data.password, 10);

  return prisma.user.create({
    data: {
      tenantId: data.tenantId,
      email: data.email,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      role: 'owner',
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      tenantId: true,
      createdAt: true,
    },
  });
}

export type LoginInput = {
  tenantId?: string;
  tenantSlug?: string;
  email: string;
  password: string;
};

export async function login(data: LoginInput) {
  let tenantId = data.tenantId;
  if (!tenantId && data.tenantSlug) {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: data.tenantSlug },
      select: { id: true },
    });
    tenantId = tenant?.id ?? undefined;
  }
  if (!tenantId) return null;

  const user = await prisma.user.findFirst({
    where: { tenantId, email: data.email },
  });
  if (!user) return null;

  const valid = await bcrypt.compare(data.password, user.passwordHash);
  if (!valid) return null;

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const payload = {
    userId: user.id,
    tenantId: user.tenantId,
    resourceId: user.resourceId,
    role: user.role,
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      tenantId: user.tenantId,
      resourceId: user.resourceId,
    },
  };
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    return decoded;
  } catch {
    return null;
  }
}
