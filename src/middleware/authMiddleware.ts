import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/authService.js';
import type { JwtPayload } from '../types/auth.js';
import { DATE_REGEX } from '../utils/validation.js';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Ensures :tenantId is present in URL params. Returns 400 if missing.
 */
export function requireTenantIdInParams(req: Request, res: Response, next: NextFunction) {
  const tenantId = typeof req.params.tenantId === 'string' ? req.params.tenantId : req.params.tenantId?.[0];
  if (!tenantId) {
    res.status(400).json({ error: 'Tenant ID is required' });
    return;
  }
  next();
}

/**
 * Ensures :resourceId is present in URL params. Returns 400 if missing.
 */
export function requireResourceIdInParams(req: Request, res: Response, next: NextFunction) {
  const resourceId = typeof req.params.resourceId === 'string' ? req.params.resourceId : req.params.resourceId?.[0];
  if (!resourceId) {
    res.status(400).json({ error: 'Resource ID is required' });
    return;
  }
  next();
}

/**
 * GET appointments: require auth OR guestId. Owner/staff need auth; guest needs guestId.
 * Staff list scope is applied in getAppointmentsHandler. Must run after optionalAuth.
 */
export function requireAuthOrGuestIdForAppointments(req: Request, res: Response, next: NextFunction) {
  if (req.method !== 'GET') return next();

  const resourceId = typeof req.query.resourceId === 'string' ? req.query.resourceId : undefined;
  const guestId = typeof req.query.guestId === 'string' ? req.query.guestId : undefined;
  const date = typeof req.query.date === 'string' && DATE_REGEX.test(req.query.date) ? req.query.date : undefined;

  // if user is not authenticated, but resourceId or date is provided, return 401
  // (this means that the user is trying to view appointments for a specific resource or date, but is not authenticated)
  if (!req.user && (resourceId != null || date != null)) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  if (!req.user && !guestId) {
    res.status(401).json({ error: 'Provide guestId to view your appointments' });
    return;
  }
  // Staff scope (resourceId) is enforced in getAppointmentsHandler from req.user
  next();
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
  const tenantId = typeof req.params.tenantId === 'string' ? req.params.tenantId : req.params.tenantId?.[0]!;
  if (req.user!.tenantId !== tenantId) {
    res.status(403).json({ error: 'Access denied to this tenant' });
    return;
  }

  next();
}

/**
 * Restricts access to users with role 'owner'. Staff and other roles receive 403.
 * Must run after requireAuth.
 */
export function requireOwner(req: Request, res: Response, next: NextFunction) {
  if (req.user!.role !== 'owner') {
    res.status(403).json({ error: 'Owner role required' });
    return;
  }
  next();
}

/**
 * Owner: full access. Staff: only when :resourceId in URL matches their req.user.resourceId.
 * Must run after requireAuth.
 */
export function requireOwnerOrOwnResource(req: Request, res: Response, next: NextFunction) {
  if (req.user!.role === 'owner') {
    next();
    return;
  }

  if (req.user!.role === 'staff') {
    const resourceId = typeof req.params.resourceId === 'string' ? req.params.resourceId : req.params.resourceId?.[0]!;
    if (req.user!.resourceId !== resourceId) {
      res.status(403).json({ error: 'Access denied to this resource' });
      return;
    }
  } else {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  next();
}

/**
 * If authenticated, user can only pull the data from their own tenant
 */
export function confirmTenantIfAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return next();
  return requireTenantAccess(req, res, next);
}

/**
 * Staff: must access only their own resource (:resourceId === req.user.resourceId). Guest/Owner: pass.
 * Use for routes like available-slots where Guest and Owner can access any resource.
 */
export function restrictStaffToTheirResource(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'staff') return next();
  const resourceId = typeof req.params.resourceId === 'string' ? req.params.resourceId : req.params.resourceId?.[0]!;
  if (req.user.resourceId !== resourceId) {
    res.status(403).json({ error: 'Access denied to this resource' });
    return;
  }
  next();
}

/**
 * GET: pass through (public). POST: require auth, tenant access, and owner role.
 * PUT/PATCH/DELETE: require auth and tenant access only (no owner check).
 * Use for routes like resource-services and resources where GET is public and POST is owner-only.
 */
export function requireOwnerPermissionToPost(req: Request, res: Response, next: NextFunction) {
  if (req.method === 'GET') return next();
  requireAuth(req, res, () =>
    requireTenantAccess(req, res, () =>
      req.method === 'POST' ? requireOwner(req, res, next) : next()
    )
  );
}
/**
 * Owner: full access. Staff: GET only own resource, POST/PUT/DELETE denied.
 * Use for resource-scoped routes like working-hours.
 */
export function requireOwnerOrStaffOwnResource(
  req: Request,
  res: Response,
  next: NextFunction
) {
  return req.method === 'GET'
    ? requireOwnerOrOwnResource(req, res, next)
    : requireOwner(req, res, next);
}

