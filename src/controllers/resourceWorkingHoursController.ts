import type { Request, Response } from 'express';
import { z } from 'zod';
import {
  createResourceWorkingHour,
  deleteResourceWorkingHour,
  getWorkingHoursByResourceId,
  updateResourceWorkingHour,
} from '../services/resourceWorkingHoursService.js';
import { getResourceId, getTenantId } from '../utils/requestUtils.js';

const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

const createWorkingHourSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(timeRegex, 'Time must be HH:MM format (e.g. 09:00)'),
  endTime: z.string().regex(timeRegex, 'Time must be HH:MM format (e.g. 18:00)'),
});

function getWorkingHourId(req: Request) {
  const workingHourId = req.params.workingHourId;
  return typeof workingHourId === 'string' ? workingHourId : workingHourId?.[0];
}

function validateTimeRange(startTime: string, endTime: string) {
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  const startMinutes = (startH ?? 0) * 60 + (startM ?? 0);
  const endMinutes = (endH ?? 0) * 60 + (endM ?? 0);
  return endMinutes > startMinutes;
}

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
  if (!validateTimeRange(data.startTime, data.endTime)) {
    res.status(400).json({ error: 'endTime must be after startTime' });
    return;
  }

  try {
    const result = await createResourceWorkingHour({
      tenantId,
      resourceId,
      dayOfWeek: data.dayOfWeek,
      startTime: data.startTime,
      endTime: data.endTime,
    });
    if (result.status === 'resource_not_found') {
      res.status(404).json({ error: 'Resource not found' });
      return;
    }
    if (result.status === 'overlap') {
      res.status(409).json({ error: 'Working hour overlaps an existing interval for this day' });
      return;
    }
    res.status(201).json(result.workingHour);
  } catch (error) {
    console.error('Create working hour error:', error);
    res.status(500).json({ error: 'Failed to create working hour' });
  }
}

export async function updateWorkingHourHandler(req: Request, res: Response) {
  const tenantId = getTenantId(req)!;
  const resourceId = getResourceId(req)!;
  const workingHourId = getWorkingHourId(req)!;
  const parsed = createWorkingHourSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  const data = parsed.data;
  if (!validateTimeRange(data.startTime, data.endTime)) {
    res.status(400).json({ error: 'endTime must be after startTime' });
    return;
  }

  try {
    const result = await updateResourceWorkingHour({
      tenantId,
      resourceId,
      workingHourId,
      dayOfWeek: data.dayOfWeek,
      startTime: data.startTime,
      endTime: data.endTime,
    });

    if (result.status === 'resource_not_found') {
      res.status(404).json({ error: 'Resource not found' });
      return;
    }
    if (result.status === 'working_hour_not_found') {
      res.status(404).json({ error: 'Working hour not found' });
      return;
    }
    if (result.status === 'overlap') {
      res.status(409).json({ error: 'Working hour overlaps an existing interval for this day' });
      return;
    }

    res.json(result.workingHour);
  } catch (error) {
    console.error('Update working hour error:', error);
    res.status(500).json({ error: 'Failed to update working hour' });
  }
}

export async function deleteWorkingHourHandler(req: Request, res: Response) {
  const tenantId = getTenantId(req)!;
  const resourceId = getResourceId(req)!;
  const workingHourId = getWorkingHourId(req)!;

  try {
    const result = await deleteResourceWorkingHour({
      tenantId,
      resourceId,
      workingHourId,
    });

    if (result.status === 'resource_not_found') {
      res.status(404).json({ error: 'Resource not found' });
      return;
    }
    if (result.status === 'working_hour_not_found') {
      res.status(404).json({ error: 'Working hour not found' });
      return;
    }

    res.json(result.workingHour);
  } catch (error) {
    console.error('Delete working hour error:', error);
    res.status(500).json({ error: 'Failed to delete working hour' });
  }
}
