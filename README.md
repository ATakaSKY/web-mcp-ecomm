# WebMCP Example — Demo Shop

A small React + TypeScript + Vite app that demonstrates **WebMCP**: registering tools on `navigator.modelContext` so AI agents can drive a fake e‑commerce UI (cart, wishlist, checkout, and declarative HTML forms).

## Prerequisites

- **Chrome 146+** with the experimental flag **“WebMCP for testing”** enabled: `chrome://flags/#enable-webmcp-testing`
- If `navigator.modelContext` is missing, the app still runs; `useWebMCP` logs a console warning and skips tool registration.

Optional: use Chrome’s **Model Context Tool Inspector** (or your agent setup) to list and invoke tools while the app is open.

## Getting started

```bash
npm install
npm run dev
```

Then open the URL Vite prints (typically [http://localhost:5173](http://localhost:5173)).

| Script        | Description                    |
| ------------- | ------------------------------ |
| `npm run dev` | Dev server with HMR            |
| `npm run build` | Typecheck + production build |
| `npm run preview` | Serve the production build   |
| `npm run lint` | ESLint                         |

## What’s in the app

- **Shop views**: product grid, cart, wishlist, checkout — all backed by a small reducer in `src/store/StoreContext.tsx`.
- **Imperative tools** (`src/hooks/useWebMCP.ts`): registered once on mount via `navigator.modelContext.registerTool`, with cleanup on unmount.
- **Declarative tools** (`src/components/DeclarativeView.tsx`, `QuickBuyModal.tsx`): ordinary `<form>` elements annotated with WebMCP attributes (`toolname`, `tooldescription`, `toolparamdescription` on fields, optional `toolautosubmit`). The browser exposes these as tools without manual `registerTool` calls.
- **Dynamic registration**: calling imperative tool `open_quick_buy` opens a modal; only then does the declarative form `complete_quick_buy` exist in the DOM, so that tool appears and disappears with the modal.

Static extras in the repo include `architecture.html` and `public/webmcp-guide.html` for diagrams and deeper notes.

## Tool reference

### Imperative (`registerTool` in `useWebMCP`)

| Tool | Purpose |
| ---- | ------- |
| `add_to_cart` | Add a catalog product by `product_id`; optional `quantity` (1–99). |
| `remove_from_cart` | Remove a line item by `product_id`. |
| `toggle_wishlist` | Add or remove a product from the wishlist. |
| `purchase` | Clear the cart after a simulated checkout (empty cart returns an error). |
| `get_cart` | Return current cart lines and total. |
| `get_products` | List products; optional `category` filter. |
| `open_quick_buy` | Open the Quick Buy modal for a `product_id`; enables `complete_quick_buy` while open. |

### Declarative (HTML attributes)

| Tool | Where | Notes |
| ---- | ----- | ----- |
| `quick_add_to_cart` | Declarative view | Uses `toolautosubmit` so the agent need not click submit. |
| `submit_feedback` | Declarative view | Standard submit flow. |
| `purchase_gift_card` | Declarative view | Multi-field example. |
| `complete_quick_buy` | `QuickBuyModal` | Only registered while the modal is mounted. |

TypeScript augments for declarative attributes live in `src/types/webmcp.d.ts`.

## Project layout (high level)

```
src/
  hooks/useWebMCP.ts      # Imperative tool registration
  store/StoreContext.tsx  # App state
  components/             # UI + DeclarativeView + QuickBuyModal
  data/products.ts        # Static catalog
```

## Tech stack

- React 19, TypeScript, Vite 8
- No backend — all data and “orders” are in-memory for the demo
