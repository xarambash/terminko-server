import type { Request } from 'express';

export function getTenantId(req: Request): string | undefined {
  const tenantId = req.params.tenantId;
  return typeof tenantId === 'string' ? tenantId : tenantId?.[0];
}

export function getResourceId(req: Request): string | undefined {
  const resourceId = req.params.resourceId;
  return typeof resourceId === 'string' ? resourceId : resourceId?.[0];
}

export function getServiceId(req: Request): string | undefined {
  const serviceId = req.params.serviceId;
  return typeof serviceId === 'string' ? serviceId : serviceId?.[0];
}

export function getFreeDayId(req: Request): string | undefined {
  const freeDayId = req.params.freeDayId;
  return typeof freeDayId === 'string' ? freeDayId : freeDayId?.[0];
}

export function getResourceServiceId(req: Request): string | undefined {
  const resourceServiceId = req.params.resourceServiceId;
  return typeof resourceServiceId === 'string' ? resourceServiceId : resourceServiceId?.[0];
}
