import type { Request, Response } from 'express';
import { z } from 'zod';
import {
  createResourceService,
  getResourceServicesByResourceId,
} from '../services/resourceServicesService.js';
import { getResourceId, getTenantId } from '../utils/requestUtils.js';

const createResourceServiceSchema = z.object({
  serviceId: z.uuid(),
  price: z.number().nonnegative(),
  durationOverride: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
});

export async function getResourceServicesHandler(req: Request, res: Response) {
  const tenantId = getTenantId(req);
  const resourceId = getResourceId(req);
  if (!tenantId || !resourceId) {
    res.status(400).json({ error: 'Tenant ID and Resource ID are required' });
    return;
  }

  try {
    const resourceServices = await getResourceServicesByResourceId(resourceId, tenantId);
    if (resourceServices === null) {
      res.status(404).json({ error: 'Resource not found' });
      return;
    }
    res.json(resourceServices);
  } catch (error) {
    console.error('Get resource services error:', error);
    res.status(500).json({ error: 'Failed to fetch resource services' });
  }
}

export async function createResourceServiceHandler(req: Request, res: Response) {
  const tenantId = getTenantId(req);
  const resourceId = getResourceId(req);
  if (!tenantId || !resourceId) {
    res.status(400).json({ error: 'Tenant ID and Resource ID are required' });
    return;
  }

  const parsed = createResourceServiceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  const data = parsed.data;

  try {
    const resourceService = await createResourceService({
      tenantId,
      resourceId,
      serviceId: data.serviceId,
      price: data.price,
      durationOverride: data.durationOverride,
      isActive: data.isActive,
    });
    if (!resourceService) {
      res.status(404).json({ error: 'Resource or service not found, or does not belong to tenant' });
      return;
    }
    res.status(201).json(resourceService);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      res.status(409).json({ error: 'Service is already assigned to this resource' });
      return;
    }
    console.error('Create resource service error:', error);
    res.status(500).json({ error: 'Failed to create resource service' });
  }
}
