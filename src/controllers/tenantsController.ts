import type { Request, Response } from 'express';
import { z } from 'zod';
import { createTenant, getTenantBySlug } from '../services/tenantsService.js';

const createTenantSchema = z.object({
  // Required
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase, alphanumeric with hyphens'),
  type: z.string().min(1),
  timezone: z.string().min(1),
  currency: z.string().min(1),
  defaultLanguage: z.string().min(1),
  // Optional
  supportedLanguages: z.array(z.string().min(1)).optional(),
});

export async function createTenantHandler(req: Request, res: Response) {
  const parsed = createTenantSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  try {
    const tenant = await createTenant(parsed.data);
    res.status(201).json(tenant);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      res.status(409).json({ error: 'Tenant with this slug already exists' });
      return;
    }
    console.error('Create tenant error:', error);
    res.status(500).json({ error: 'Failed to create tenant' });
  }
}

export async function getTenantBySlugHandler(req: Request, res: Response) {
  const slug = req.params.slug;
  const slugStr = typeof slug === 'string' ? slug : slug?.[0];
  if (!slugStr) {
    res.status(400).json({ error: 'Slug is required' });
    return;
  }

  try {
    const tenant = await getTenantBySlug(slugStr);
    if (!tenant) {
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }
    res.json(tenant);
  } catch (error) {
    console.error('Get tenant error:', error);
    res.status(500).json({ error: 'Failed to fetch tenant' });
  }
}
