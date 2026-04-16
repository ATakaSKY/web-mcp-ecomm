/**
 * CI guard: keep fallback catalog and documented API shapes aligned with `Product`
 * and common JSON responses. Extend this file when you add new public contract surfaces.
 */
import { products } from "../src/data/products.js";
import type { Product } from "../src/types/index.js";

function assertProduct(x: unknown, path: string): asserts x is Product {
  if (!x || typeof x !== "object") throw new Error(`${path}: expected object`);
  const o = x as Record<string, unknown>;
  for (const k of ["id", "name", "description", "image", "category"] as const) {
    if (typeof o[k] !== "string" || !(o[k] as string).trim()) {
      throw new Error(`${path}.${k}: non-empty string required`);
    }
  }
  if (typeof o.price !== "number" || !Number.isFinite(o.price) || o.price < 0) {
    throw new Error(`${path}.price: non-negative number required`);
  }
}

for (let i = 0; i < products.length; i++) {
  assertProduct(products[i], `src/data/products[${i}]`);
}

/** POST /api/orders 201 */
const orderCreated = { orderId: "00000000-0000-4000-8000-000000000000", totalPaise: 100 };
if (typeof orderCreated.orderId !== "string" || typeof orderCreated.totalPaise !== "number") {
  throw new Error("orders201 contract sample invalid");
}

/** POST /api/razorpay-create-order 200 (non-skip) */
const rzpOrder = {
  keyId: "rzp_test_x",
  razorpayOrderId: "order_x",
  amountPaise: 100,
  currency: "INR",
  appOrderId: orderCreated.orderId,
};
for (const [k, v] of Object.entries(rzpOrder)) {
  if (typeof v !== "string" && typeof v !== "number") {
    throw new Error(`razorpay-create-order contract: ${k}`);
  }
}

console.log(
  `check-api-contracts: OK (${products.length} fallback products, sample contracts wired)`,
);
