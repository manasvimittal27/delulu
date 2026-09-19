import { Router } from "express";
import { z } from "zod";
import { db } from "../db/client";
import { waitlist } from "../db/schema";

export const waitlistRouter = Router();

waitlistRouter.post("/", async (req, res) => {
  const { phone, city } = z.object({ phone: z.string().optional(), city: z.string() }).parse(req.body);
  await db.insert(waitlist).values({ phone, city });
  res.json({ ok: true });
});
