import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../db/schema";
import { products as seedCatalog } from "../src/data/products";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Set DATABASE_URL to run this seed script.");
  process.exit(1);
}

const sql = postgres(url, { max: 1 });
const db = drizzle(sql, { schema });

for (const p of seedCatalog) {
  await db
    .insert(schema.products)
    .values({
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price,
      image: p.image,
      category: p.category,
    })
    .onConflictDoUpdate({
      target: schema.products.id,
      set: {
        name: p.name,
        description: p.description,
        price: p.price,
        image: p.image,
        category: p.category,
      },
    });
}

console.log(`Seeded ${seedCatalog.length} products.`);
await sql.end();
