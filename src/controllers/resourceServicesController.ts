import type { Request, Response } from 'express';
import { z } from 'zod';
import {
  createResourceService,
  deleteResourceService,
  getResourceServicesByResourceId,
  updateResourceService,
} from '../services/resourceServicesService.js';
import { getResourceId, getResourceServiceId, getTenantId } from '../utils/requestUtils.js';

const updateResourceServiceSchema = z
  .object({
    price: z.number().nonnegative().optional(),
    durationOverride: z.number().int().positive().nullable().optional(),
  })
  .refine((d) => d.price !== undefined || d.durationOverride !== undefined, {
    message: 'At least one of price or durationOverride must be provided',
  });

const createResourceServiceSchema = z.object({
  serviceId: z.uuid(),
  price: z.number().nonnegative(),
  durationOverride: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
});

export async function getResourceServicesHandler(req: Request, res: Response) {
  const tenantId = getTenantId(req)!;
  const resourceId = getResourceId(req)!;
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
  const tenantId = getTenantId(req)!;
  const resourceId = getResourceId(req)!;
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

export async function updateResourceServiceHandler(req: Request, res: Response) {
  const tenantId = getTenantId(req)!;
  const resourceId = getResourceId(req)!;
  const resourceServiceId = getResourceServiceId(req)!;

  const parsed = updateResourceServiceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  try {
    const result = await updateResourceService({
      tenantId,
      resourceId,
      resourceServiceId,
      ...(parsed.data.price !== undefined && { price: parsed.data.price }),
      ...(parsed.data.durationOverride !== undefined && { durationOverride: parsed.data.durationOverride }),
    });

    if (result.status === 'resource_not_found') {
      res.status(404).json({ error: 'Resource not found' });
      return;
    }
    if (result.status === 'not_found') {
      res.status(404).json({ error: 'Resource service not found' });
      return;
    }

    res.json(result.data);
  } catch (error) {
    console.error('Update resource service error:', error);
    res.status(500).json({ error: 'Failed to update resource service' });
  }
}

export async function deleteResourceServiceHandler(req: Request, res: Response) {
  const tenantId = getTenantId(req)!;
  const resourceId = getResourceId(req)!;
  const resourceServiceId = getResourceServiceId(req)!;

  try {
    const result = await deleteResourceService({ tenantId, resourceId, resourceServiceId });

    if (result.status === 'resource_not_found') {
      res.status(404).json({ error: 'Resource not found' });
      return;
    }
    if (result.status === 'not_found') {
      res.status(404).json({ error: 'Resource service not found' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    console.error('Delete resource service error:', error);
    res.status(500).json({ error: 'Failed to delete resource service' });
  }
}
