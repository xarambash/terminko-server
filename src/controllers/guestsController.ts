import type { Request, Response } from 'express';
import { z } from 'zod';
import { createGuest, getGuestsByTenantId } from '../services/guestsService.js';
import { getTenantId } from '../utils/requestUtils.js';

const createGuestSchema = z.object({
  name: z.string().min(1),
  email: z.email(),
  phone: z.string().min(1),
  notes: z.string().optional(),
});

export async function getGuestsHandler(req: Request, res: Response) {
  const tenantId = getTenantId(req);
  if (!tenantId) {
    res.status(400).json({ error: 'Tenant ID is required' });
    return;
  }

  try {
    const guests = await getGuestsByTenantId(tenantId);
    res.json(guests);
  } catch (error) {
    console.error('Get guests error:', error);
    res.status(500).json({ error: 'Failed to fetch guests' });
  }
}

export async function createGuestHandler(req: Request, res: Response) {
  const tenantId = getTenantId(req);
  if (!tenantId) {
    res.status(400).json({ error: 'Tenant ID is required' });
    return;
  }

  const parsed = createGuestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  const data = parsed.data;

  try {
    const guest = await createGuest({
      tenantId,
      name: data.name,
      email: data.email,
      phone: data.phone,
      notes: data.notes,
    });
    res.status(201).json(guest);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }
    console.error('Create guest error:', error);
    res.status(500).json({ error: 'Failed to create guest' });
  }
}
