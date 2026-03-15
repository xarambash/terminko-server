import type { Request, Response } from 'express';
import { getAvailableSlots } from '../services/availableSlotsService.js';
import { getTenantId, getResourceId } from '../utils/requestUtils.js';
import { DATE_REGEX } from '../utils/validation.js';

export async function getAvailableSlotsHandler(req: Request, res: Response) {
  const tenantId = getTenantId(req)!;
  const resourceId = getResourceId(req)!;
  const serviceId = typeof req.query.serviceId === 'string' ? req.query.serviceId : undefined;
  const date = typeof req.query.date === 'string' && DATE_REGEX.test(req.query.date)
    ? req.query.date
    : undefined;

  if (!serviceId || !date) {
    res.status(400).json({ error: 'Missing required query params: serviceId, date (YYYY-MM-DD)' });
    return;
  }

  try {
    const slots = await getAvailableSlots({
      tenantId,
      resourceId,
      serviceId,
      date,
    });

    if (slots === null) {
      res.status(404).json({ error: 'Resource or service not found' });
      return;
    }

    res.json(slots);
  } catch (error) {
    console.error('Get available slots error:', error);
    res.status(500).json({ error: 'Failed to fetch available slots' });
  }
}
