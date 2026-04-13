import type { VercelRequest, VercelResponse } from "@vercel/node";
import { and, eq } from "drizzle-orm";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../auth.js";
import { getDb } from "../db/client.js";
import { orders as ordersTable } from "../db/schema.js";
import { getRazorpay, getRazorpayKeyId } from "../lib/razorpayClient.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const rzp = getRazorpay();
  const keyId = getRazorpayKeyId();
  if (!rzp || !keyId) {
    res.status(200).json({ skipped: true as const });
    return;
  }

  let body: { orderId?: string };
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    res.status(400).json({ error: "Invalid JSON" });
    return;
  }

  const orderId = body.orderId;
  if (!orderId || typeof orderId !== "string") {
    res.status(400).json({ error: "orderId required" });
    return;
  }

  const db = getDb();
  if (!db) {
    res.status(503).json({ error: "Database unavailable" });
    return;
  }

  const [order] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, orderId))
    .limit(1);

  if (!order || order.status !== "pending") {
    res.status(400).json({ error: "Order not found or not payable" });
    return;
  }

  if (order.userId) {
    const sessionData = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    if (sessionData?.user?.id !== order.userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
  }

  try {
    const rzpOrder = await rzp.orders.create({
      amount: order.totalPaise,
      currency: "INR",
      receipt: order.id.replace(/-/g, "").slice(0, 40),
      notes: { app_order_id: order.id },
    });

    console.log("rzpOrder", rzpOrder);

    await db
      .update(ordersTable)
      .set({ razorpayOrderId: rzpOrder.id })
      .where(
        and(eq(ordersTable.id, order.id), eq(ordersTable.status, "pending")),
      );

    res.status(200).json({
      keyId,
      razorpayOrderId: rzpOrder.id,
      amountPaise: order.totalPaise,
      currency: "INR",
      appOrderId: order.id,
    });
  } catch (e) {
    console.error("[api/razorpay-create-order]", e);
    res.status(502).json({
      error:
        "Could not create Razorpay order. Check keys and dashboard mode (test/live).",
    });
  }
}
