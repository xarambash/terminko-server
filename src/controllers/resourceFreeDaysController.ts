import type { Request, Response } from 'express';
import { z } from 'zod';
import {
  createResourceFreeDay,
  deleteResourceFreeDay,
  getFreeDaysByResourceId,
} from '../services/resourceFreeDaysService.js';
import { getFreeDayId, getResourceId, getTenantId } from '../utils/requestUtils.js';
import { DATE_REGEX } from '../utils/validation.js';

const createFreeDaySchema = z
  .object({
    start_date: z
      .string()
      .regex(DATE_REGEX, 'start_date must be YYYY-MM-DD format')
      .transform((s) => new Date(s)),
    end_date: z
      .string()
      .regex(DATE_REGEX, 'end_date must be YYYY-MM-DD format')
      .transform((s) => new Date(s))
      .optional(),
    reason: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.end_date && data.end_date < data.start_date) return false;
      return true;
    },
    { message: 'end_date must be >= start_date' }
  );

export async function getFreeDaysHandler(req: Request, res: Response) {
  const tenantId = getTenantId(req)!;
  const resourceId = getResourceId(req)!;
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
  const tenantId = getTenantId(req)!;
  const resourceId = getResourceId(req)!;

  const parsed = createFreeDaySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  const { start_date, end_date, reason } = parsed.data;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (start_date < today) {
    res.status(400).json({ error: 'start_date must not be in the past' });
    return;
  }

  try {
    const result = await createResourceFreeDay({
      tenantId,
      resourceId,
      startDate: start_date,
      endDate: end_date ?? start_date,
      reason,
    });

    if (result.status === 'resource_not_found') {
      res.status(404).json({ error: 'Resource not found' });
      return;
    }
    if (result.status === 'overlap') {
      res.status(409).json({ error: result.message });
      return;
    }

    res.status(201).json(result.freeDay);
  } catch (error) {
    console.error('Create free day error:', error);
    res.status(500).json({ error: 'Failed to create free day' });
  }
}

export async function deleteFreeDayHandler(req: Request, res: Response) {
  const tenantId = getTenantId(req)!;
  const resourceId = getResourceId(req)!;
  const freeDayId = getFreeDayId(req)!;

  try {
    const result = await deleteResourceFreeDay({ tenantId, resourceId, freeDayId });

    if (result.status === 'resource_not_found') {
      res.status(404).json({ error: 'Resource not found' });
      return;
    }
    if (result.status === 'free_day_not_found') {
      res.status(404).json({ error: 'Free day not found' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    console.error('Delete free day error:', error);
    res.status(500).json({ error: 'Failed to delete free day' });
  }
}
