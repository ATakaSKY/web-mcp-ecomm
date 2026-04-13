import { createHmac, timingSafeEqual } from "node:crypto";

/** Checkout callback: HMAC of `order_id|payment_id` with key secret. */
export function verifyRazorpayPaymentSignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  signature: string,
  secret: string,
): boolean {
  const payload = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  if (expected.length !== signature.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(signature, "utf8"));
  } catch {
    return false;
  }
}

/** Webhook: HMAC of raw request body with webhook secret. */
export function verifyRazorpayWebhookBody(
  rawBody: string,
  signature: string | string[] | undefined,
  secret: string,
): boolean {
  if (typeof signature !== "string" || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  if (expected.length !== signature.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(signature, "utf8"));
  } catch {
    return false;
  }
}
