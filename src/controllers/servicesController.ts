import type { Request, Response } from 'express';
import { z } from 'zod';
import { createService, getServicesByTenantId } from '../services/servicesService.js';
import { getTenantId } from '../utils/requestUtils.js';

const createServiceSchema = z.object({
  name: z.string().min(1),
  durationMinutes: z.number().int().positive(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function getServicesHandler(req: Request, res: Response) {
  const tenantId = getTenantId(req);
  if (!tenantId) {
    res.status(400).json({ error: 'Tenant ID is required' });
    return;
  }

  try {
    const services = await getServicesByTenantId(tenantId);
    res.json(services);
  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
}

export async function createServiceHandler(req: Request, res: Response) {
  const tenantId = getTenantId(req);
  if (!tenantId) {
    res.status(400).json({ error: 'Tenant ID is required' });
    return;
  }

  const parsed = createServiceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  const data = parsed.data;

  try {
    const service = await createService({
      tenantId,
      name: data.name,
      durationMinutes: data.durationMinutes,
      description: data.description,
      isActive: data.isActive,
      sortOrder: data.sortOrder,
    });
    res.status(201).json(service);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }
    console.error('Create service error:', error);
    res.status(500).json({ error: 'Failed to create service' });
  }
}
