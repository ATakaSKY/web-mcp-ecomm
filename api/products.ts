import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq } from "drizzle-orm";
import { products as fallbackCatalog } from "../src/data/products";
import { getDb } from "../db/client";
import { products as productsTable } from "../db/schema";

function toClientProduct(row: {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
}) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: row.price,
    image: row.image,
    category: row.category,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const db = getDb();
  if (!db) {
    res.status(200).json(fallbackCatalog);
    return;
  }

  try {
    const id = req.query.id;
    if (typeof id === "string" && id.length > 0) {
      const rows = await db
        .select()
        .from(productsTable)
        .where(eq(productsTable.id, id))
        .limit(1);
      const row = rows[0];
      if (!row) {
        res.status(404).json({ error: "Product not found" });
        return;
      }
      res.status(200).json(toClientProduct(row));
      return;
    }

    const rows = await db.select().from(productsTable);
    if (rows.length === 0) {
      res.status(200).json(fallbackCatalog);
      return;
    }
    res.status(200).json(rows.map(toClientProduct));
  } catch (e) {
    console.error("[api/products]", e);
    res.status(200).json(fallbackCatalog);
  }
}
