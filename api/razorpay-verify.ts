import type { VercelRequest, VercelResponse } from "@vercel/node";
import { and, eq } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { orders as ordersTable } from "../db/schema.js";
import { getRazorpayKeySecret } from "../lib/razorpayClient.js";
import { verifyRazorpayPaymentSignature } from "../lib/razorpayVerify.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const secret = getRazorpayKeySecret();
  if (!secret) {
    res.status(503).json({ error: "Razorpay not configured" });
    return;
  }

  let body: {
    appOrderId?: string;
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
  };
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    res.status(400).json({ error: "Invalid JSON" });
    return;
  }

  const appOrderId = body.appOrderId;
  const razorpayOrderId = body.razorpay_order_id;
  const razorpayPaymentId = body.razorpay_payment_id;
  const razorpaySignature = body.razorpay_signature;

  if (
    typeof appOrderId !== "string" ||
    typeof razorpayOrderId !== "string" ||
    typeof razorpayPaymentId !== "string" ||
    typeof razorpaySignature !== "string"
  ) {
    res.status(400).json({ error: "Missing payment fields" });
    return;
  }

  if (
    !verifyRazorpayPaymentSignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      secret,
    )
  ) {
    res.status(400).json({ error: "Invalid payment signature" });
    return;
  }

  const db = getDb();
  if (!db) {
    res.status(503).json({ error: "Database unavailable" });
    return;
  }

  const updated = await db
    .update(ordersTable)
    .set({ status: "paid" })
    .where(
      and(
        eq(ordersTable.id, appOrderId),
        eq(ordersTable.status, "pending"),
        eq(ordersTable.razorpayOrderId, razorpayOrderId),
      ),
    )
    .returning({ id: ordersTable.id });

  if (updated.length === 0) {
    res.status(409).json({ error: "Order already paid or does not match this payment" });
    return;
  }

  res.status(200).json({ ok: true, orderId: appOrderId });
}
