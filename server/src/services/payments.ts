import crypto from "node:crypto";

const hasRazorpay = Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

export interface PaymentOrder {
  orderId: string;
  amountPaise: number;
  provider: "razorpay" | "mock";
}

export async function createOrder(amountPaise: number): Promise<PaymentOrder> {
  if (hasRazorpay) {
    // real Razorpay order creation would go here using RAZORPAY_KEY_ID/SECRET
    throw new Error("Razorpay live mode not configured in this prototype");
  }
  const orderId = `mock_order_${crypto.randomUUID()}`;
  return { orderId, amountPaise, provider: "mock" };
}

export async function verifyPayment(orderId: string, paymentId: string, signature: string): Promise<boolean> {
  if (hasRazorpay) {
    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");
    return expected === signature;
  }
  // mock mode: accept any payment id that references the mock order and a signature we ourselves issued
  return signature === mockSignature(orderId, paymentId);
}

export function mockSignature(orderId: string, paymentId: string): string {
  return crypto.createHmac("sha256", "mock_secret").update(`${orderId}|${paymentId}`).digest("hex");
}

export async function mockPaymentDelay(): Promise<void> {
  await new Promise((r) => setTimeout(r, 1500));
}
