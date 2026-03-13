import type { Request } from 'express';

export function getTenantId(req: Request): string | undefined {
  const tenantId = req.params.tenantId;
  return typeof tenantId === 'string' ? tenantId : tenantId?.[0];
}

export function getResourceId(req: Request): string | undefined {
  const resourceId = req.params.resourceId;
  return typeof resourceId === 'string' ? resourceId : resourceId?.[0];
}
