# WebMCP Example — Demo Shop

A small **React + TypeScript + Vite** app that demonstrates **WebMCP**: registering tools on `navigator.modelContext` so AI agents can drive a shop UI (cart, wishlist, checkout, and declarative HTML forms).

The repo is evolved in **phases** (see [docs/PHASES.md](docs/PHASES.md)): **Phase 1** — client persistence; **Phase 2** — **Postgres + Drizzle** and **`GET /api/products`**; **Phase 3** — **`POST /api/orders`**; **Phase 4** — **Better Auth**; **Phase 5** — **Razorpay**; **Phase 6** — **caching, CDN-friendly images, catalog admin API, CI contracts** ([docs/scale-ops.md](docs/scale-ops.md)).

---

## Prerequisites

- **Node.js** 20+ recommended (for tooling; Vite/React as per `package.json`).
- **Chrome 146+** with the experimental flag **“WebMCP for testing”**: `chrome://flags/#enable-webmcp-testing`  
  If `navigator.modelContext` is missing, the app still runs; `useWebMCP` logs a warning and skips tool registration.
- Optional: **Docker** for local Postgres ([`docker-compose.yml`](docker-compose.yml)).
- Optional: **Vercel CLI** for local API routes: `npx vercel dev`.

---

## Quick start (frontend only)

No database required: the app tries `GET /api/products`, and if that is unavailable (e.g. plain `npm run dev`), it **falls back** to the static catalog in [`src/data/products.ts`](src/data/products.ts).

```bash
npm install
npm run dev
```

Open the URL Vite prints (typically [http://localhost:5173](http://localhost:5173)).

---

## Full stack locally (Postgres + `/api/*`)

1. **Start Postgres** (Docker example):

   ```bash
   npm run docker:db:up
   ```

2. **Environment** — copy and edit:

   ```bash
   cp .env.example .env
   ```

   Set `DATABASE_URL` (or `DATABASE_POSTGRES_URL` from Neon). For auth with `vercel dev`, set **`BETTER_AUTH_SECRET`** (e.g. `openssl rand -base64 32`) and **`BETTER_AUTH_URL=http://localhost:3000`** (match the URL Vercel prints).

3. **Schema + seed**:

   ```bash
   npm run db:migrate
   npm run db:seed
   ```

4. **Run app + API** (Vite + serverless routes on one origin):

   ```bash
   npx vercel dev
   ```

   Open the URL Vercel prints (often `http://localhost:3000`). **`GET /api/products`** and **`POST /api/orders`** use the database when `DATABASE_URL` is set. Plain `npm run dev` has **no** `/api` routes: catalog falls back to static data and checkout returns **503** if you only run Vite.

**After schema updates:** if you changed `db/schema.ts`, run `npm run db:generate`, commit the new files under `drizzle/`, then `npm run db:migrate` on each database. After pulling someone else’s migration, run `npm run db:migrate` before `db:seed` or ordering.

**Useful scripts**

| Script                                    | Description                                                       |
| ----------------------------------------- | ----------------------------------------------------------------- |
| `npm run dev`                             | Vite only; catalog fallback from `src/data/products.ts`           |
| `npm run docker:db:up` / `docker:db:down` | Start/stop Docker Postgres                                        |
| `npm run docker:db:logs`                  | Follow DB logs                                                    |
| `npm run db:generate`                     | Create SQL migrations from `db/schema.ts` (commit `drizzle/`)     |
| `npm run db:migrate`                      | Apply pending migrations (loads `.env` via `drizzle.config.ts`)   |
| `npm run db:push`                         | Optional: sync schema without migration files (local prototyping) |
| `npm run db:seed`                         | Seed `products` from `src/data/products.ts`                       |
| `npm run db:studio`                       | Drizzle Studio (needs `DATABASE_URL`)                             |
| `npm run build`                           | Typecheck + production Vite build                                 |
| `npm run preview`                         | Serve the production build                                        |
| `npm run lint`                            | ESLint                                                            |
| `npm run check:contracts`                 | Validate fallback catalog + sample API shapes (CI) |

Step-by-step checks (caching, admin API, images): [docs/manual-testing.md](docs/manual-testing.md).

---

## Deployment (Vercel)

- Connect the repo to Vercel; `vercel.json` sets **Vite** build output to `dist`.
- Set **`DATABASE_URL`** or **`DATABASE_POSTGRES_URL`** in the project environment (e.g. Neon).
- **Auth (Phase 4):** set **`BETTER_AUTH_SECRET`** (≥32 characters) and **`BETTER_AUTH_URL`** to your production site origin (e.g. `https://your-project.vercel.app`). Optional **`BETTER_AUTH_TRUSTED_ORIGINS`** for extra allowed origins (comma-separated).
- **Migrations on production:** a push to `main` that touches `db/`, `drizzle/`, `drizzle.config.ts`, root `package.json` / `package-lock.json`, or [`.github/workflows/db-migrate.yml`](.github/workflows/db-migrate.yml) runs that workflow, which executes **`npm run db:migrate`** using the **`DATABASE_URL`** [repository secret](https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions) (use the same Neon connection string as Vercel production). For anything else (or if a push did not match those paths), run it manually from the Actions tab (**Database migrate** → **Run workflow**). Ship new files under `drizzle/` in the same commit as schema changes.
- **Seeding:** run **`npm run db:seed`** against production only when you need catalog data there (one-off from a secure machine with `DATABASE_URL=…` set for that command, or a dedicated workflow if you add one). Do not commit secrets.
- **Phase 6 (ops):** [`vercel.json`](vercel.json) adds **cache headers** for assets, `/api/products`, and the HTML shell. Optional **`ADMIN_API_SECRET`** enables **`PUT /api/admin/product`** (see [docs/scale-ops.md](docs/scale-ops.md)).
- **CI:** [`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs **`check:contracts`**, **lint**, and **build** on pushes/PRs to `main`.
- `api/products.ts` → **`GET /api/products`**; `api/orders.ts` → **`POST /api/orders`**; `api/auth/[...all].ts` → **`/api/auth/*`** (Better Auth).

`VITE_API_BASE` is only needed if the API is hosted on a **different origin** than the SPA.

---

## What’s in the app

- **State** — [`src/store/StoreContext.tsx`](src/store/StoreContext.tsx): cart, wishlist, views, catalog load state, WebMCP-related UI state.
- **Persistence (Phase 1)** — [`src/lib/persist.ts`](src/lib/persist.ts): cart/wishlist in `localStorage`; after Phase 2, persistence syncs once the **API catalog** has loaded.
- **Catalog (Phase 2)** — Loaded from **`GET /api/products`** with fallback to [`src/data/products.ts`](src/data/products.ts).
- **Orders (Phase 3)** — **`POST /api/orders`** creates `orders` + `order_lines`; checkout needs **`vercel dev`** or deployed API + database URL.
- **Auth (Phase 4)** — [`auth.ts`](auth.ts), [`api/auth/[...all].ts`](api/auth/[...all].ts), [`src/lib/authClient.ts`](src/lib/authClient.ts); header **Sign in** opens account UI; orders include **`user_id`** when the session cookie is present (`credentials: "include"` on checkout).
- **Payments (Phase 5)** — Razorpay Standard Checkout; see [docs/razorpay-flow.md](docs/razorpay-flow.md).
- **Scale & ops (Phase 6)** — Cache headers ([`vercel.json`](vercel.json), [`api/products.ts`](api/products.ts)), [`ProductImage`](src/components/ProductImage.tsx), optional [`api/admin/product.ts`](api/admin/product.ts); [docs/scale-ops.md](docs/scale-ops.md).
- **Imperative WebMCP** — [`src/hooks/useWebMCP.ts`](src/hooks/useWebMCP.ts): tools register **after** the catalog is available; `product_id` is a **string** (use `get_products` / `list_products` for IDs).
- **Declarative WebMCP** — [`src/components/DeclarativeView.tsx`](src/components/DeclarativeView.tsx), [`src/components/QuickBuyModal.tsx`](src/components/QuickBuyModal.tsx): forms use `toolname`, `tooldescription`, `toolparamdescription`, optional `toolautosubmit`.

Static reference material: `architecture.html`, `public/webmcp-guide.html`.

---

## Tool reference (imperative)

Registered when the catalog is non-empty (`navigator.modelContext` + Chrome flag).

| Tool               | Purpose                                                                              |
| ------------------ | ------------------------------------------------------------------------------------ |
| `add_to_cart`      | Add by `product_id` (string); optional `quantity` (1–99).                            |
| `remove_from_cart` | Remove line by `product_id`.                                                         |
| `toggle_wishlist`  | Toggle wishlist membership for `product_id`.                                         |
| `purchase`         | **`POST /api/orders`** then Razorpay or skip; clears cart after success (needs DB + optional Razorpay keys). |
| `get_cart`         | Current lines and total.                                                             |
| `get_products`     | List catalog; optional `category` filter (enum of current categories).               |
| `list_products`    | Compact listing (same catalog snapshot).                                             |
| `open_quick_buy`   | Opens Quick Buy modal; enables declarative `complete_quick_buy` while open.          |

### Declarative (HTML attributes)

| Tool                 | Location                             |
| -------------------- | ------------------------------------ |
| `quick_add_to_cart`  | Declarative view                     |
| `submit_feedback`    | Declarative view                     |
| `purchase_gift_card` | Declarative view                     |
| `complete_quick_buy` | Quick Buy modal (only while mounted) |

TypeScript augments for WebMCP attributes: [`src/types/webmcp.d.ts`](src/types/webmcp.d.ts).

---

## Project layout (high level)

```
auth.ts                  # Better Auth server config (Drizzle adapter)
api/products.ts          # GET /api/products
api/orders.ts            # POST /api/orders
api/auth/[...all].ts     # /api/auth/* (sessions, sign-in, etc.)
db/                      # Drizzle schema + DB client
drizzle.config.ts        # Drizzle Kit (+ dotenv for local .env)
docker-compose.yml       # Optional local Postgres
scripts/seed.ts          # Seed DB from src/data/products.ts
src/
  hooks/useWebMCP.ts
  store/StoreContext.tsx
  lib/persist.ts
  components/
  data/products.ts       # Fallback catalog + seed source
docs/PHASES.md           # Phase 1–2 summary & roadmap
```

---

## Tech stack

- React 19, TypeScript, Vite 8
- **Optional:** Drizzle ORM, `postgres`, Postgres (local Docker or hosted)
- **Optional:** Vercel serverless for `api/`
- Cart/wishlist: **client-side** persistence until a future “server cart” phase (see [docs/PHASES.md](docs/PHASES.md)).

---

## Roadmap

See **[docs/PHASES.md](docs/PHASES.md)** for completed phases (1–2) and planned next steps (orders, auth, Stripe, scale).
