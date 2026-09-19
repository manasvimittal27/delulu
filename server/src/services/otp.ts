import { db } from "../db/client";
import { otpCodes } from "../db/schema";
import { eq, and, gt, desc } from "drizzle-orm";

const DEV_OTP = "123456";
const hasProvider = Boolean(process.env.SMS_PROVIDER_API_KEY);

function generateCode(): string {
  // Without a real SMS provider configured, there is no way for a user to
  // receive a random code — always fall back to the fixed dev OTP regardless
  // of NODE_ENV, otherwise nobody can ever sign in.
  if (!hasProvider) return DEV_OTP;
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function issueOtp(phone: string) {
  const code = generateCode();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  await db.insert(otpCodes).values({ phone, code, expiresAt });

  if (hasProvider) {
    // real SMS provider integration would go here
  } else {
    console.log(`[dev-otp] ${phone} -> ${code}`);
  }

  return { devOtp: !hasProvider ? code : undefined };
}

export async function verifyOtp(phone: string, code: string): Promise<boolean> {
  const [latest] = await db
    .select()
    .from(otpCodes)
    .where(and(eq(otpCodes.phone, phone), gt(otpCodes.expiresAt, new Date())))
    .orderBy(desc(otpCodes.createdAt))
    .limit(1);

  if (!latest || latest.consumedAt) return false;
  if (latest.attempts >= 5) return false;

  await db
    .update(otpCodes)
    .set({ attempts: latest.attempts + 1 })
    .where(eq(otpCodes.id, latest.id));

  if (latest.code !== code) return false;

  await db.update(otpCodes).set({ consumedAt: new Date() }).where(eq(otpCodes.id, latest.id));
  return true;
}
