import type { Request, Response, NextFunction } from "express";
import { db } from "../db/client";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const userId = req.session.userId;
  if (!userId) {
    return res.status(401).json({ error: "Not signed in" });
  }
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) {
    return res.status(401).json({ error: "Session invalid" });
  }
  if (user.bannedAt) {
    return res.status(403).json({ error: "Account banned" });
  }
  if (user.suspendedUntil && user.suspendedUntil > new Date()) {
    return res.status(403).json({ error: "Account suspended", until: user.suspendedUntil });
  }
  (req as any).user = user;
  next();
}

export function requireOnboarded(step: string) {
  const order = ["profile", "quiz", "avatar", "done"];
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "Not signed in" });
    const userStep = order.indexOf(user.onboardingStep);
    const requiredStep = order.indexOf(step);
    if (userStep < requiredStep) {
      return res.status(409).json({ error: "Onboarding incomplete", redirectTo: user.onboardingStep });
    }
    next();
  };
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}
