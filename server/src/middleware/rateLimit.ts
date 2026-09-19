const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= max) {
    return false;
  }
  bucket.count += 1;
  return true;
}

import type { Request, Response, NextFunction } from "express";

export function rateLimitMiddleware(prefix: string, max: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${prefix}:${req.ip}`;
    if (!rateLimit(key, max, windowMs)) {
      return res.status(429).json({ error: "Too many requests, slow down" });
    }
    next();
  };
}
