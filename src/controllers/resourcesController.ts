import type { Request, Response } from 'express';
import { z } from 'zod';
import { createResource, deleteResource, getResourcesByTenantId } from '../services/resourcesService.js';
import { getResourceId, getTenantId } from '../utils/requestUtils.js';

const createResourceSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  profilePicture: z.string().optional(),
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
});

export async function getResourcesHandler(req: Request, res: Response) {
  const tenantId = getTenantId(req)!;
  try {
    const resources = await getResourcesByTenantId(tenantId);
    res.json(resources);
  } catch (error) {
    console.error('Get resources error:', error);
    res.status(500).json({ error: 'Failed to fetch resources' });
  }
}

export async function createResourceHandler(req: Request, res: Response) {
  const tenantId = getTenantId(req)!;
  const parsed = createResourceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  const data = parsed.data;

  try {
    const resource = await createResource({
      tenantId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      password: data.password,
      profilePicture: data.profilePicture,
      phone: data.phone,
      isActive: data.isActive,
      displayOrder: data.displayOrder,
    });
    res.status(201).json(resource);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }
    console.error('Create resource error:', error);
    res.status(500).json({ error: 'Failed to create resource' });
  }
}

export async function deleteResourceHandler(req: Request, res: Response) {
  const tenantId = getTenantId(req)!;
  const resourceId = getResourceId(req);
  if (!resourceId) {
    res.status(400).json({ error: 'Resource ID is required' });
    return;
  }

  try {
    const result = await deleteResource(tenantId, resourceId);
    if (result.status === 'not_found') {
      res.status(404).json({ error: 'Resource not found' });
      return;
    }
    if (result.status === 'has_future_appointments') {
      res.status(409).json({
        error: 'Cannot delete resource: there are future scheduled appointments for this resource',
      });
      return;
    }
    res.json(result.resource);
  } catch (error) {
    console.error('Delete resource error:', error);
    res.status(500).json({ error: 'Failed to delete resource' });
  }
}
