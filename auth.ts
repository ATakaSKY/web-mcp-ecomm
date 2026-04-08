import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDb } from "./db/client.js";
import * as schema from "./db/schema.js";

const db = getDb();
if (!db) {
  throw new Error(
    "DATABASE_URL or DATABASE_POSTGRES_URL is required for Better Auth (same as catalog/orders).",
  );
}

function trustedOrigins(): string[] {
  const raw = process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "";
  const extra = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const base = process.env.BETTER_AUTH_URL;
  const devDefaults = ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173"];
  return [...new Set([...(base ? [base] : []), ...devDefaults, ...extra])];
}

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  trustedOrigins: trustedOrigins(),
  advanced: {
    trustedProxyHeaders: true,
  },
});
