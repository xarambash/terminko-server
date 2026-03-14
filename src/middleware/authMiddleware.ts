import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/authService.js';
import type { JwtPayload } from '../types/auth.js';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Verifies JWT from Authorization header if present; sets req.user. Never blocks.
 * Use for routes that support both guest (no token) and staff/owner (with token), e.g. GET appointments.
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

  if (token) {
    const payload = verifyToken(token);
    if (payload) req.user = payload;
  }
  next();
}

/**
 * Validates JWT from Authorization: Bearer header. Returns 401 if missing or invalid/expired.
 * Sets req.user with decoded payload on success.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  req.user = payload;
  next();
}

/**
 * Ensures req.user.tenantId matches :tenantId from URL. Returns 403 on cross-tenant access.
 * Must run after requireAuth or optionalAuth (when req.user exists).
 */
export function requireTenantAccess(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const tenantId = typeof req.params.tenantId === 'string' ? req.params.tenantId : req.params.tenantId?.[0];
  if (!tenantId) {
    res.status(400).json({ error: 'Tenant ID is required' });
    return;
  }

  if (req.user.tenantId !== tenantId) {
    res.status(403).json({ error: 'Access denied to this tenant' });
    return;
  }

  next();
}

/**
 * Restricts access to users with role 'owner'. Staff and other roles receive 403.
 * Use for owner-only actions, e.g. creating resources.
 */
export function requireOwner(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  if (req.user.role !== 'owner') {
    res.status(403).json({ error: 'Owner role required' });
    return;
  }
  next();
}

/**
 * Owner: full access. Staff: only when :resourceId in URL matches their req.user.resourceId.
 * Use for resource-scoped routes (working hours, free days, resource services).
 */
export function requireOwnerOrOwnResource(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (req.user.role === 'owner') {
    next();
    return;
  }

  if (req.user.role === 'staff') {
    const resourceId = typeof req.params.resourceId === 'string' ? req.params.resourceId : req.params.resourceId?.[0];
    if (resourceId && req.user.resourceId !== resourceId) {
      res.status(403).json({ error: 'Access denied to this resource' });
      return;
    }
  } else {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  next();
}
