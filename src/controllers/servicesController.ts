import type { Request, Response } from 'express';
import { z } from 'zod';
import {
  createService,
  deleteService,
  getServicesByTenantId,
  updateService,
} from '../services/servicesService.js';
import { getServiceId, getTenantId } from '../utils/requestUtils.js';

const createServiceSchema = z.object({
  name: z.string().min(1),
  durationMinutes: z.number().int().positive(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

const updateServiceSchema = z
  .object({
    name: z.string().min(1).optional(),
    durationMinutes: z.number().int().positive().optional(),
    description: z.string().nullable().optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, { message: 'At least one field is required' });

export async function getServicesHandler(req: Request, res: Response) {
  const tenantId = getTenantId(req)!;
  try {
    const services = await getServicesByTenantId(tenantId);
    res.json(services);
  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
}

export async function createServiceHandler(req: Request, res: Response) {
  const tenantId = getTenantId(req)!;
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

export async function updateServiceHandler(req: Request, res: Response) {
  const tenantId = getTenantId(req)!;
  const serviceId = getServiceId(req);
  if (!serviceId) {
    res.status(400).json({ error: 'Service ID is required' });
    return;
  }

  const parsed = updateServiceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  try {
    const result = await updateService(tenantId, serviceId, parsed.data);
    if (result.status === 'not_found') {
      res.status(404).json({ error: 'Service not found' });
      return;
    }
    res.json(result.service);
  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json({ error: 'Failed to update service' });
  }
}

export async function deleteServiceHandler(req: Request, res: Response) {
  const tenantId = getTenantId(req)!;
  const serviceId = getServiceId(req);
  if (!serviceId) {
    res.status(400).json({ error: 'Service ID is required' });
    return;
  }

  try {
    const result = await deleteService(tenantId, serviceId);
    if (result.status === 'not_found') {
      res.status(404).json({ error: 'Service not found' });
      return;
    }
    if (result.status === 'has_future_appointments') {
      res.status(409).json({
        error: 'Cannot delete service: there are future scheduled appointments for this service',
      });
      return;
    }
    res.json(result.service);
  } catch (error) {
    console.error('Delete service error:', error);
    res.status(500).json({ error: 'Failed to delete service' });
  }
}
