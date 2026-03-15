import type { Request, Response } from 'express';
import { getGuestsByTenantId } from '../services/guestsService.js';
import { getTenantId } from '../utils/requestUtils.js';

export async function getGuestsHandler(req: Request, res: Response) {
  const tenantId = getTenantId(req)!;
  try {
    const guests = await getGuestsByTenantId(tenantId);
    res.json(guests);
  } catch (error) {
    console.error('Get guests error:', error);
    res.status(500).json({ error: 'Failed to fetch guests' });
  }
}
