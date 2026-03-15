import type { Request, Response } from 'express';
import { z } from 'zod';
import {
  createResourceWorkingHour,
  getWorkingHoursByResourceId,
} from '../services/resourceWorkingHoursService.js';
import { getResourceId, getTenantId } from '../utils/requestUtils.js';

const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

const createWorkingHourSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(timeRegex, 'Time must be HH:MM format (e.g. 09:00)'),
  endTime: z.string().regex(timeRegex, 'Time must be HH:MM format (e.g. 18:00)'),
});

export async function getWorkingHoursHandler(req: Request, res: Response) {
  const tenantId = getTenantId(req)!;
  const resourceId = getResourceId(req)!;
  try {
    const workingHours = await getWorkingHoursByResourceId(resourceId, tenantId);
    if (workingHours === null) {
      res.status(404).json({ error: 'Resource not found' });
      return;
    }
    res.json(workingHours);
  } catch (error) {
    console.error('Get working hours error:', error);
    res.status(500).json({ error: 'Failed to fetch working hours' });
  }
}

export async function createWorkingHourHandler(req: Request, res: Response) {
  const tenantId = getTenantId(req)!;
  const resourceId = getResourceId(req)!;
  const parsed = createWorkingHourSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  const data = parsed.data;

  // Validate endTime > startTime
  const [startH, startM] = data.startTime.split(':').map(Number);
  const [endH, endM] = data.endTime.split(':').map(Number);
  const startMinutes = (startH ?? 0) * 60 + (startM ?? 0);
  const endMinutes = (endH ?? 0) * 60 + (endM ?? 0);
  if (endMinutes <= startMinutes) {
    res.status(400).json({ error: 'endTime must be after startTime' });
    return;
  }

  try {
    const workingHour = await createResourceWorkingHour({
      tenantId,
      resourceId,
      dayOfWeek: data.dayOfWeek,
      startTime: data.startTime,
      endTime: data.endTime,
    });
    if (!workingHour) {
      res.status(404).json({ error: 'Resource not found' });
      return;
    }
    res.status(201).json(workingHour);
  } catch (error) {
    console.error('Create working hour error:', error);
    res.status(500).json({ error: 'Failed to create working hour' });
  }
}
