import type { Request, Response } from 'express';
import { z } from 'zod';
import { login, registerOwner } from '../services/authService.js';

const registerSchema = z.object({
  tenantId: z.string().uuid(),
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

const loginSchema = z
  .object({
    tenantId: z.uuid().optional(),
    tenantSlug: z.string().min(1).optional(),
    email: z.email(),
    password: z.string().min(1),
  })
  .refine((data) => data.tenantId ?? data.tenantSlug, {
    message: 'tenantId or tenantSlug is required',
  });

export async function registerHandler(req: Request, res: Response) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  try {
    const user = await registerOwner(parsed.data);
    if (!user) {
      res.status(400).json({
        error: 'Registration failed: tenant not found or email already exists',
      });
      return;
    }
    res.status(201).json(user);
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Failed to register' });
  }
}

export async function loginHandler(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  try {
    const { tenantId, tenantSlug, email, password } = parsed.data;
    const result = await login({
      ...(tenantId && { tenantId }),
      ...(tenantSlug && { tenantSlug }),
      email,
      password,
    });
    if (!result) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }
    res.json(result);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
}
