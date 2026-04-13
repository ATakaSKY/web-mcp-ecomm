import type { VercelRequest, VercelResponse } from "@vercel/node";
import { and, eq } from "drizzle-orm";
import { getDb } from "../../db/client.js";
import { orders as ordersTable } from "../../db/schema.js";
import { readWebhookRawBody } from "../../lib/readWebhookBody.js";
import { verifyRazorpayWebhookBody } from "../../lib/razorpayVerify.js";

type RazorpayWebhookPayload = {
  event?: string;
  payload?: {
    payment?: { entity?: { order_id?: string; status?: string } };
  };
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const whSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!whSecret) {
    res.status(503).json({ error: "Webhook secret not configured" });
    return;
  }

  let rawBody: string;
  try {
    rawBody = await readWebhookRawBody(req);
  } catch (e) {
    console.error("[api/webhooks/razorpay] body", e);
    res.status(400).json({ error: "Invalid body" });
    return;
  }

  const sig = req.headers["x-razorpay-signature"];
  if (!verifyRazorpayWebhookBody(rawBody, sig, whSecret)) {
    res.status(400).json({ error: "Invalid signature" });
    return;
  }

  let parsed: RazorpayWebhookPayload;
  try {
    parsed = JSON.parse(rawBody) as RazorpayWebhookPayload;
  } catch {
    res.status(400).json({ error: "Invalid JSON" });
    return;
  }

  if (parsed.event !== "payment.captured") {
    res.status(200).json({ ok: true, ignored: true });
    return;
  }

  const rzpOrderId = parsed.payload?.payment?.entity?.order_id;
  if (typeof rzpOrderId !== "string" || !rzpOrderId) {
    res.status(200).json({ ok: true, ignored: true });
    return;
  }

  const db = getDb();
  if (!db) {
    res.status(503).json({ error: "Database unavailable" });
    return;
  }

  await db
    .update(ordersTable)
    .set({ status: "paid" })
    .where(
      and(
        eq(ordersTable.razorpayOrderId, rzpOrderId),
        eq(ordersTable.status, "pending"),
      ),
    );

  res.status(200).json({ ok: true });
}
