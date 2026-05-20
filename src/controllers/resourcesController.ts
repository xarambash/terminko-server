import type { Request, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import {
  createResource,
  deleteResource,
  getResourcesByTenantId,
  updateResource,
  uploadResourcePhoto,
} from '../services/resourcesService.js';
import { getResourceId, getTenantId } from '../utils/requestUtils.js';

export const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
    }
  },
});

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

const updateResourceSchema = z
  .object({
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    email: z.email().optional(),
    phone: z.string().nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, { message: 'At least one field is required' });

export async function updateResourceHandler(req: Request, res: Response) {
  const tenantId = getTenantId(req)!;
  const resourceId = getResourceId(req);
  if (!resourceId) {
    res.status(400).json({ error: 'Resource ID is required' });
    return;
  }

  const parsed = updateResourceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  try {
    const result = await updateResource(tenantId, resourceId, parsed.data);
    if (result.status === 'not_found') {
      res.status(404).json({ error: 'Resource not found' });
      return;
    }
    res.json(result.resource);
  } catch (error) {
    console.error('Update resource error:', error);
    res.status(500).json({ error: 'Failed to update resource' });
  }
}

export async function uploadResourcePhotoHandler(req: Request, res: Response) {
  const tenantId = getTenantId(req)!;
  const resourceId = getResourceId(req);
  if (!resourceId) {
    res.status(400).json({ error: 'Resource ID is required' });
    return;
  }

  if (!req.file) {
    res.status(400).json({ error: 'Photo file is required' });
    return;
  }

  try {
    const result = await uploadResourcePhoto(
      tenantId,
      resourceId,
      req.file.buffer,
      req.file.mimetype
    );
    if (result.status === 'not_found') {
      res.status(404).json({ error: 'Resource not found' });
      return;
    }
    if (result.status === 'storage_error') {
      res.status(500).json({ error: `Photo upload failed: ${result.message}` });
      return;
    }
    res.json(result.resource);
  } catch (error) {
    console.error('Upload resource photo error:', error);
    res.status(500).json({ error: 'Failed to upload photo' });
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
