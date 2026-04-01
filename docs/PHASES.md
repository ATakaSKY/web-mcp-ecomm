# Delivery phases

This repo is grown in **phases**: each phase adds a slice of “real app” behavior while keeping WebMCP demo value. Completed work is summarized below; later phases are the planned direction (not all implemented yet).

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
- **Full stack:** Postgres (e.g. [Docker](../docker-compose.yml)) + `.env` with `DATABASE_URL` → `npm run db:push` && `npm run db:seed` → `npx vercel dev` so `/api/products` runs against the DB.

See the main [README](../README.md) for commands and layout.

---

## Phase 3 — Orders (planned)

**Goal:** Real **`POST /api/orders`** with Drizzle tables (`orders`, `order_lines`), server-side validation against `products`, checkout UI calling the API (still no payment required).

**Not started** in this branch unless explicitly built.

---

## Phase 4 — Auth (planned)

**Goal:** Optional sign-in (e.g. Clerk), attach **`userId`** to orders, optional server-side cart merge.

---

## Phase 5 — Payments + hardening (planned)

**Goal:** Stripe Checkout + webhooks, order status → `paid`, inventory updates, rate limits / observability as needed.

---

## Phase 6 — Scale & ops (planned)

**Goal:** Image/CDN strategy, caching headers, admin/CMS for catalog, CI checks on API contracts.

---

## How to extend the next phase

1. Agree scope (e.g. “Phase 3 only”).
2. Add migrations or `drizzle-kit push` for new tables.
3. Implement API routes under `api/` and keep the SPA’s **`fetch()` + env** pattern aligned with Vercel deployment.
4. For WebMCP: keep tools **catalog-driven** (reload or `get_products` / `list_products`) so IDs stay valid when the DB changes.

If you add phases beyond this doc, append a new section here so the iteration story stays in one place.
