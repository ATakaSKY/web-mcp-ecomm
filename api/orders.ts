import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "node:crypto";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../auth.js";
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

async function handleGetMyOrders(req: VercelRequest, res: VercelResponse) {
  const db = getDb();
  if (!db) {
    res.status(503).json({
      error: "Orders require a database. Set DATABASE_URL and run npm run db:migrate.",
    });
    return;
  }

  const sessionData = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  const userId = sessionData?.user?.id;
  if (!userId) {
    res.status(401).json({ error: "Sign in required" });
    return;
  }

  const rows = await db
    .select({
      orderId: ordersTable.id,
      orderStatus: ordersTable.status,
      orderTotalPaise: ordersTable.totalPaise,
      orderCreatedAt: ordersTable.createdAt,
      quantity: orderLinesTable.quantity,
      unitPrice: orderLinesTable.unitPrice,
      productId: productsTable.id,
      productName: productsTable.name,
      productImage: productsTable.image,
    })
    .from(ordersTable)
    .innerJoin(orderLinesTable, eq(orderLinesTable.orderId, ordersTable.id))
    .innerJoin(productsTable, eq(productsTable.id, orderLinesTable.productId))
    .where(eq(ordersTable.userId, userId))
    .orderBy(desc(ordersTable.createdAt), asc(orderLinesTable.id));

  type LineOut = {
    quantity: number;
    unitPrice: number;
    product: { id: string; name: string; image: string };
  };
  type OrderOut = {
    id: string;
    status: string;
    totalPaise: number;
    createdAt: string | null;
    lines: LineOut[];
  };

  const byOrderId = new Map<string, OrderOut>();
  for (const row of rows) {
    let order = byOrderId.get(row.orderId);
    if (!order) {
      order = {
        id: row.orderId,
        status: row.orderStatus,
        totalPaise: row.orderTotalPaise,
        createdAt: row.orderCreatedAt
          ? row.orderCreatedAt.toISOString()
          : null,
        lines: [],
      };
      byOrderId.set(row.orderId, order);
    }
    order.lines.push({
      quantity: row.quantity,
      unitPrice: row.unitPrice,
      product: {
        id: row.productId,
        name: row.productName,
        image: row.productImage,
      },
    });
  }

  res.status(200).json({ orders: [...byOrderId.values()] });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    await handleGetMyOrders(req, res);
    return;
  }

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

  const sessionData = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  const userId = sessionData?.user?.id ?? null;

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
        ...(userId ? { userId } : {}),
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
    const code =
      e && typeof e === "object" && "code" in e && typeof (e as { code: unknown }).code === "string"
        ? (e as { code: string }).code
        : undefined;
    if (code === "23503") {
      res.status(500).json({
        error:
          "Database rejected the order (account or product row missing). Try signing out and signing in again, run npm run db:migrate && npm run db:seed, then retry.",
      });
      return;
    }
    if (code === "42703" || code === "42P01") {
      res.status(500).json({
        error: "Database schema is out of date. Run: npm run db:migrate",
      });
      return;
    }
    res.status(500).json({ error: "Failed to create order" });
    return;
  }

  res.status(201).json({ orderId, totalPaise });
}
