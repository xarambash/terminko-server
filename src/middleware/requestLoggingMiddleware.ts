import type { Request, Response, NextFunction } from 'express';

const SENSITIVE_KEYS = ['password', 'token', 'authorization'];

function sanitize(obj: unknown): unknown {
  if (!obj || typeof obj !== 'object') return obj;
  const copy = Array.isArray(obj) ? [...obj] : { ...obj };
  for (const key of Object.keys(copy)) {
    if (SENSITIVE_KEYS.some((k) => key.toLowerCase().includes(k))) {
      (copy as Record<string, unknown>)[key] = '[REDACTED]';
    } else if (typeof (copy as Record<string, unknown>)[key] === 'object') {
      (copy as Record<string, unknown>)[key] = sanitize(
        (copy as Record<string, unknown>)[key]
      );
    }
  }
  return copy;
}

export function requestLoggingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const start = Date.now();

  console.log('[REQUEST]', {
    method: req.method,
    path: req.path,
    query: Object.keys(req.query).length ? req.query : undefined,
    params: Object.keys(req.params).length ? req.params : undefined,
    body: Object.keys(req.body || {}).length ? sanitize(req.body) : undefined,
  });

  const originalJson = res.json.bind(res);
  res.json = function (body: unknown) {
    console.log('[RESPONSE]', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${Date.now() - start}ms`,
      body: sanitize(body),
    });
    return originalJson(body);
  };

  next();
}
