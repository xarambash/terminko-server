import type { Request, Response } from 'express';
import { z } from 'zod';
import {
  createResourceFreeDay,
  getFreeDaysByResourceId,
} from '../services/resourceFreeDaysService.js';
import { getResourceId, getTenantId } from '../utils/requestUtils.js';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const createFreeDaySchema = z.object({
  date: z.string().regex(dateRegex, 'Date must be YYYY-MM-DD format').transform((s) => new Date(s)),
  reason: z.string().optional(),
});

export async function getFreeDaysHandler(req: Request, res: Response) {
  const tenantId = getTenantId(req);
  const resourceId = getResourceId(req);
  if (!tenantId || !resourceId) {
    res.status(400).json({ error: 'Tenant ID and Resource ID are required' });
    return;
  }

  try {
    const freeDays = await getFreeDaysByResourceId(resourceId, tenantId);
    if (freeDays === null) {
      res.status(404).json({ error: 'Resource not found' });
      return;
    }
    res.json(freeDays);
  } catch (error) {
    console.error('Get free days error:', error);
    res.status(500).json({ error: 'Failed to fetch free days' });
  }
}

export async function createFreeDayHandler(req: Request, res: Response) {
  const tenantId = getTenantId(req);
  const resourceId = getResourceId(req);
  if (!tenantId || !resourceId) {
    res.status(400).json({ error: 'Tenant ID and Resource ID are required' });
    return;
  }

  const parsed = createFreeDaySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  const data = parsed.data;

  try {
    const freeDay = await createResourceFreeDay({
      tenantId,
      resourceId,
      date: data.date,
      reason: data.reason,
    });
    if (!freeDay) {
      res.status(404).json({ error: 'Resource not found' });
      return;
    }
    res.status(201).json(freeDay);
  } catch (error) {
    console.error('Create free day error:', error);
    res.status(500).json({ error: 'Failed to create free day' });
  }
}
