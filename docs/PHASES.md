# Delivery phases

This repo is grown in **phases**: each phase adds a slice of “real app” behavior while keeping WebMCP demo value. Phases **1–6** are implemented; extend beyond that by appending new sections below.

---

## Phase 1 — Client persistence (done)

**Goal:** Cart and wishlist survive refresh and browser restarts, without a backend.

**What shipped**

- `localStorage` key `web-mcp-shop-v1`: minimal JSON (`cartLines` + `wishlist`).
- **Phase 1 alone:** the catalog was static ([`src/data/products.ts`](../src/data/products.ts)); cart and wishlist hydrated on load and saved whenever they changed.
- **Phase 2 onward:** the catalog loads from the API; persistence runs only after `SET_PRODUCTS` so storage is not overwritten with an empty cart before hydration.
- **Not** persisted: current view, checkout flags, Quick Buy modal state.

**Relevant files**

- [`src/lib/persist.ts`](../src/lib/persist.ts) — load / save / hydrate helpers.
- [`src/store/StoreContext.tsx`](../src/store/StoreContext.tsx) — reducer, optional `SET_PRODUCTS` / fetch flow, and persistence `useEffect`.

---

## Phase 2 — Catalog API + Drizzle + Postgres (done)

**Goal:** Products are the **source of truth** in Postgres, exposed via a Vercel-style serverless route, while the SPA keeps using Phase 1 persistence for cart/wishlist.

**What shipped**

- **Drizzle ORM** schema for `products` ([`db/schema.ts`](../db/schema.ts)), DB access ([`db/client.ts`](../db/client.ts)), Drizzle Kit ([`drizzle.config.ts`](../drizzle.config.ts)).
- **`GET /api/products`** ([`api/products.ts`](../api/products.ts)): returns JSON array of products; supports `?id=` for a single row. If `DATABASE_URL` is missing, the DB errors, or the table is empty, the handler **falls back** to [`src/data/products.ts`](../src/data/products.ts).
- **SPA** loads the catalog on startup via `fetch('/api/products')`, then dispatches `SET_PRODUCTS` and **re-hydrates** cart/wishlist from `localStorage` against that catalog.
- **WebMCP** ([`src/hooks/useWebMCP.ts`](../src/hooks/useWebMCP.ts)): tools register only after the catalog is loaded; `product_id` fields use **plain strings** (no brittle enums). Added **`list_products`** next to **`get_products`**.

**Local development**

- **Frontend only:** `npm run dev` — no `/api` route on Vite; fetch fails → **fallback catalog** (still useful for UI/WebMCP).
- **Full stack:** Postgres (e.g. [Docker](../docker-compose.yml)) + `.env` with `DATABASE_URL` → `npm run db:migrate` && `npm run db:seed` → `npx vercel dev` so `/api/products` runs against the DB.

See the main [README](../README.md) for commands and layout.

---

## Phase 3 — Orders (done)

**Goal:** Persist **`POST /api/orders`** with Drizzle (`orders`, `order_lines`), prices taken from the DB at order time, checkout UI + WebMCP **`purchase`** calling the API. Payment capture is [**Phase 5**](#phase-5--razorpay-india--webhooks-done) (Razorpay); until then `status` can stay `pending`.

**What shipped**

- **Schema:** `order_status` enum (`pending` \| `paid` \| `fulfilled`), [`orders`](../db/schema.ts), [`order_lines`](../db/schema.ts) with `unitPrice` per line.
- **`POST /api/orders`** ([`api/orders.ts`](../api/orders.ts)): body `{ lines: [{ productId, quantity }] }` → **`201`** `{ orderId, totalPaise }` (order total in **paise**, 100 paise = ₹1). Returns **503** if `DATABASE_URL` is unset (orders require a DB).
- **SPA:** [`CartView`](../src/components/CartView.tsx) posts the cart; [`PURCHASE_SUCCESS`](../src/types/index.ts) stores [`lastOrderId`](../src/store/StoreContext.tsx); [`CheckoutView`](../src/components/CheckoutView.tsx) shows the id.
- **WebMCP:** [`purchase`](../src/hooks/useWebMCP.ts) uses the same API (async).

After pulling schema changes, run **`npm run db:migrate`** against your database.

---

## Phase 4 — Auth (done)

**Goal:** Users in Postgres, cookie sessions, optional sign-in; attach **`userId`** to orders when logged in.

**What shipped**

- **[Better Auth](https://www.better-auth.com/)** + Drizzle: `user`, `session`, `account`, `verification` in [`db/schema.ts`](../db/schema.ts); config [`auth.ts`](../auth.ts) at repo root.
- **`/api/auth/*`** — catch-all [`api/auth/[...all].ts`](../api/auth/[...all].ts) via `toNodeHandler` (same origin as the SPA on Vercel / `vercel dev`).
- **Email + password** (`emailAndPassword.enabled`). Phone OTP can be added later with the `phoneNumber` plugin + SMS provider.
- **SPA:** [`authClient`](../src/lib/authClient.ts) (`credentials: "include"`), header **Sign in** → [`AuthPanel`](../src/components/AuthPanel.tsx); orders **`POST /api/orders`** sends cookies so [`api/orders.ts`](../api/orders.ts) can `getSession` and set `orders.user_id`.
- **Env (server):** `BETTER_AUTH_SECRET` (≥32 chars), `BETTER_AUTH_URL` (e.g. `https://<project>.vercel.app` or `http://localhost:3000` for `vercel dev`). Optional `BETTER_AUTH_TRUSTED_ORIGINS` (comma-separated) for extra origins.

**Migration:** [`drizzle/0002_elite_harry_osborn.sql`](../drizzle/0002_elite_harry_osborn.sql) — run `npm run db:migrate` after pull.

**Not in scope:** Server-side cart merge, OAuth providers, or phone OTP (planned as follow-ups).

---

## Phase 5 — Razorpay (India) + webhooks (done)

**Goal:** Razorpay Standard Checkout in **INR** (UPI, cards, netbanking, wallets) so **`orders.status`** can move **`pending` → `paid`**.

**Diagrams & walkthrough:** [docs/razorpay-flow.md](./razorpay-flow.md) (Mermaid flowchart + sequence + env table).

Inventory, rate limits, and observability remain for later phases.

---

## Phase 6 — Scale & ops (done)

**Goal:** Image/CDN-friendly catalog URLs, HTTP caching, minimal catalog admin, CI checks on API contracts.

**What shipped**

- **Caching:** [`vercel.json`](../vercel.json) sets long-lived cache for hashed **`/assets/*`**, short CDN cache for **`/api/products`**, and **`must-revalidate`** for **`/`**. [`api/products.ts`](../api/products.ts) emits the same **`Cache-Control`** on JSON responses.
- **Images:** shared [`ProductImage`](../src/components/ProductImage.tsx) (`lazy`, `async` decode, `referrerPolicy`). Guidance in [docs/scale-ops.md](./scale-ops.md).
- **Catalog admin:** **`PUT /api/admin/product`** with **`ADMIN_API_SECRET`** + header **`x-admin-secret`** — upsert one product (no separate CMS UI). Details in [docs/scale-ops.md](./scale-ops.md).
- **CI:** [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) runs **`npm run check:contracts`**, **`lint`**, **`build`**. Contract script: [`scripts/check-api-contracts.ts`](../scripts/check-api-contracts.ts).

**Not in scope:** Full admin UI, image resizing pipeline, or rate limiting (add as needed for production traffic).

---

## How to extend the next phase

1. Agree scope (e.g. “Phase 4 only”).
2. Change `db/schema.ts`, run `npm run db:generate`, commit `drizzle/`, then `npm run db:migrate` (use `db:push` only for quick local experiments).
3. Implement API routes under `api/` and keep the SPA’s **`fetch()` + env** pattern aligned with Vercel deployment.
4. For WebMCP: keep tools **catalog-driven** (reload or `get_products` / `list_products`) so IDs stay valid when the DB changes.

If you add phases beyond this doc, append a new section here so the iteration story stays in one place.
