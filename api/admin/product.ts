import type { VercelRequest, VercelResponse } from "@vercel/node";
import { timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "../../db/client.js";
import { products as productsTable } from "../../db/schema.js";

function verifyAdmin(req: VercelRequest): boolean {
  const secret = process.env.ADMIN_API_SECRET?.trim();
  if (!secret) return false;
  const raw = req.headers["x-admin-secret"];
  const sent = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : "";
  if (typeof sent !== "string" || sent.length !== secret.length) return false;
  try {
    return timingSafeEqual(Buffer.from(sent, "utf8"), Buffer.from(secret, "utf8"));
  } catch {
    return false;
  }
}

/**
 * Minimal catalog ops: **PUT** upserts one product by `id` (matches SPA `Product` shape).
 * Guard with **`ADMIN_API_SECRET`** via header **`x-admin-secret`**. Omit the env var to disable.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!process.env.ADMIN_API_SECRET?.trim()) {
    res.status(503).json({ error: "Admin API not configured (set ADMIN_API_SECRET)" });
    return;
  }
  if (!verifyAdmin(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const db = getDb();
  if (!db) {
    res.status(503).json({ error: "Database unavailable" });
    return;
  }

  if (req.method !== "PUT") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  let body: unknown;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    res.status(400).json({ error: "Invalid JSON" });
    return;
  }

  if (!body || typeof body !== "object") {
    res.status(400).json({ error: "Body must be a product object" });
    return;
  }

  const p = body as Record<string, unknown>;
  if (typeof p.id !== "string" || !p.id) {
    res.status(400).json({ error: "id required" });
    return;
  }
  for (const key of ["name", "description", "image", "category"] as const) {
    if (typeof p[key] !== "string" || !(p[key] as string).trim()) {
      res.status(400).json({ error: `${key} must be a non-empty string` });
      return;
    }
  }
  if (typeof p.price !== "number" || !Number.isFinite(p.price) || p.price < 0) {
    res.status(400).json({ error: "price must be a non-negative finite number" });
    return;
  }

  const row = {
    id: p.id,
    name: p.name as string,
    description: p.description as string,
    price: p.price,
    image: p.image as string,
    category: p.category as string,
  };

  const existing = await db
    .select({ id: productsTable.id })
    .from(productsTable)
    .where(eq(productsTable.id, row.id))
    .limit(1);

  if (existing.length > 0) {
    await db.update(productsTable).set(row).where(eq(productsTable.id, row.id));
  } else {
    await db.insert(productsTable).values(row);
  }

  res.status(200).json({ ok: true, product: row });
}
