# WebMCP Example — Demo Shop

A small **React + TypeScript + Vite** app that demonstrates **WebMCP**: registering tools on `navigator.modelContext` so AI agents can drive a shop UI (cart, wishlist, checkout, and declarative HTML forms).

The repo is evolved in **phases** (see [docs/PHASES.md](docs/PHASES.md)): **Phase 1** adds client persistence; **Phase 2** adds **Postgres + Drizzle** and **`GET /api/products`** while keeping cart/wishlist in the browser.

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

## Full stack locally (Postgres + `/api/products`)

1. **Start Postgres** (Docker example):

   ```bash
   npm run docker:db:up
   ```

2. **Environment** — copy and edit:

   ```bash
   cp .env.example .env
   ```

   Set `DATABASE_URL` (see `.env.example`; default matches `docker-compose.yml`).

3. **Schema + seed**:

   ```bash
   npm run db:push
   npm run db:seed
   ```

4. **Run app + API** (Vite + serverless routes on one origin):

   ```bash
   npx vercel dev
   ```

   Open the URL Vercel prints (often `http://localhost:3000`). The SPA loads products from the database when `DATABASE_URL` is available to the function.

**Useful scripts**

| Script                                    | Description                                                |
| ----------------------------------------- | ---------------------------------------------------------- |
| `npm run dev`                             | Vite only; catalog fallback from `src/data/products.ts`    |
| `npm run docker:db:up` / `docker:db:down` | Start/stop Docker Postgres                                 |
| `npm run docker:db:logs`                  | Follow DB logs                                             |
| `npm run db:push`                         | Push Drizzle schema (loads `.env` via `drizzle.config.ts`) |
| `npm run db:seed`                         | Seed `products` from `src/data/products.ts`                |
| `npm run db:studio`                       | Drizzle Studio (needs `DATABASE_URL`)                      |
| `npm run build`                           | Typecheck + production Vite build                          |
| `npm run preview`                         | Serve the production build                                 |
| `npm run lint`                            | ESLint                                                     |

---

## Deployment (Vercel)

- Connect the repo to Vercel; `vercel.json` sets **Vite** build output to `dist`.
- Set **`DATABASE_URL`** in the project environment (e.g. Neon or Vercel Postgres).
- After first deploy (or anytime the schema changes), run **`npm run db:push`** and **`npm run db:seed`** against the **production** `DATABASE_URL` from a secure machine (do not commit secrets).
- `api/products.ts` is deployed as **`GET /api/products`** automatically.

`VITE_API_BASE` is only needed if the API is hosted on a **different origin** than the SPA.

---

## What’s in the app

- **State** — [`src/store/StoreContext.tsx`](src/store/StoreContext.tsx): cart, wishlist, views, catalog load state, WebMCP-related UI state.
- **Persistence (Phase 1)** — [`src/lib/persist.ts`](src/lib/persist.ts): cart/wishlist in `localStorage`; after Phase 2, persistence syncs once the **API catalog** has loaded.
- **Catalog (Phase 2)** — Loaded from **`GET /api/products`** with fallback to [`src/data/products.ts`](src/data/products.ts).
- **Imperative WebMCP** — [`src/hooks/useWebMCP.ts`](src/hooks/useWebMCP.ts): tools register **after** the catalog is available; `product_id` is a **string** (use `get_products` / `list_products` for IDs).
- **Declarative WebMCP** — [`src/components/DeclarativeView.tsx`](src/components/DeclarativeView.tsx), [`src/components/QuickBuyModal.tsx`](src/components/QuickBuyModal.tsx): forms use `toolname`, `tooldescription`, `toolparamdescription`, optional `toolautosubmit`.

Static reference material: `architecture.html`, `public/webmcp-guide.html`.

---

## Tool reference (imperative)

Registered when the catalog is non-empty (`navigator.modelContext` + Chrome flag).

| Tool               | Purpose                                                                     |
| ------------------ | --------------------------------------------------------------------------- |
| `add_to_cart`      | Add by `product_id` (string); optional `quantity` (1–99).                   |
| `remove_from_cart` | Remove line by `product_id`.                                                |
| `toggle_wishlist`  | Toggle wishlist membership for `product_id`.                                |
| `purchase`         | Demo checkout: clears cart and shows success view.                          |
| `get_cart`         | Current lines and total.                                                    |
| `get_products`     | List catalog; optional `category` filter (enum of current categories).      |
| `list_products`    | Compact listing (same catalog snapshot).                                    |
| `open_quick_buy`   | Opens Quick Buy modal; enables declarative `complete_quick_buy` while open. |

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
api/products.ts          # GET /api/products (Vercel serverless)
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
