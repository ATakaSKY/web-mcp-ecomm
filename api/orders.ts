import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "node:crypto";
import { inArray } from "drizzle-orm";
import { getDb } from "../db/client.js";
import {
  orderLines as orderLinesTable,
  orders as ordersTable,
  products as productsTable,
} from "../db/schema.js";

type ProductRow = typeof productsTable.$inferSelect;

type LineInput = { productId: string; quantity: number };

/** `unitPrice` is catalog price in INR (rupees); returns line total in paise (100 paise = ₹1). */
function linePaise(unitPrice: number, quantity: number): number {
  return Math.round(unitPrice * 100) * quantity;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const db = getDb();
  if (!db) {
    res.status(503).json({
      error: "Orders require a database. Set DATABASE_URL and run npm run db:migrate.",
    });
    return;
  }

  let body: { lines?: LineInput[] };
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    res.status(400).json({ error: "Invalid JSON" });
    return;
  }

  const lines = body.lines;
  if (!Array.isArray(lines) || lines.length === 0) {
    res.status(400).json({ error: "lines must be a non-empty array" });
    return;
  }

  for (const line of lines) {
    if (
      !line ||
      typeof line.productId !== "string" ||
      typeof line.quantity !== "number" ||
      line.quantity < 1 ||
      line.quantity > 99
    ) {
      res
        .status(400)
        .json({ error: "Each line needs productId (string) and quantity (1–99)" });
      return;
    }
  }

  const ids = [...new Set(lines.map((l) => l.productId))];
  const productRows = await db
    .select()
    .from(productsTable)
    .where(inArray(productsTable.id, ids));

  if (productRows.length !== ids.length) {
    res.status(400).json({ error: "One or more products not found" });
    return;
  }

  const byId = new Map<string, ProductRow>(productRows.map((p) => [p.id, p]));
  let totalPaise = 0;
  const resolved: { productId: string; quantity: number; unitPrice: number }[] = [];

  for (const line of lines) {
    const p = byId.get(line.productId)!;
    totalPaise += linePaise(p.price, line.quantity);
    resolved.push({
      productId: p.id,
      quantity: line.quantity,
      unitPrice: p.price,
    });
  }

  const orderId = randomUUID();

  try {
    await db.transaction(async (tx) => {
      await tx.insert(ordersTable).values({
        id: orderId,
        totalPaise,
      });
      await tx.insert(orderLinesTable).values(
        resolved.map((r) => ({
          orderId,
          productId: r.productId,
          quantity: r.quantity,
          unitPrice: r.unitPrice,
        })),
      );
    });
  } catch (e) {
    console.error("[api/orders]", e);
    res.status(500).json({ error: "Failed to create order" });
    return;
  }

  res.status(201).json({ orderId, totalPaise });
}
