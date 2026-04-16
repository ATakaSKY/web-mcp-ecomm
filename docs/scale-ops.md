# Scale & ops (Phase 6)

Operational defaults for this demo shop: **caching**, **images/CDN**, **lightweight catalog admin**, and **CI contract checks**.

---

## HTTP caching

| Surface | Policy |
| ------- | ------ |
| **Vite build assets** `/assets/*` | `Cache-Control: public, max-age=31536000, immutable` (hashed filenames). Set in [`vercel.json`](../vercel.json). |
| **`GET /api/products`** | `public, s-maxage=60, stale-while-revalidate=300` — short edge cache; revalidate in background. Set in [`vercel.json`](../vercel.json) and in [`api/products.ts`](../api/products.ts) so local `vercel dev` matches. |
| **HTML shell** `/` | `public, max-age=0, must-revalidate` — pick up new SPA bundles after deploy. |

Tune `s-maxage` if your catalog changes rarely (e.g. hours) or very often (e.g. seconds).

---

## Images & CDN

- Store **`products.image`** as **absolute HTTPS URLs** (e.g. your object storage, `images.unsplash.com`, Imgix, Cloudinary). The app does not proxy or optimize images.
- UI uses [`ProductImage`](../src/components/ProductImage.tsx): **`loading="lazy"`**, **`decoding="async"`**, and a conservative **`referrerPolicy`** to avoid leaking full page URLs to third-party hosts.
- For production at scale: put a **CDN** in front of image origins, use consistent sizes in URLs (your seed data already uses `w=400` style query params where supported).

---

## Catalog admin API (minimal “CMS”)

Upsert one row in **`products`** without a separate admin UI.

- **Route:** `PUT /api/admin/product`
- **Header:** `x-admin-secret: <ADMIN_API_SECRET>` (same value as server env; use constant-time compare on the server).
- **Body:** JSON object with `id`, `name`, `description`, `price` (number), `image`, `category` — same shape as [`Product`](../src/types/index.ts).
- If **`ADMIN_API_SECRET`** is unset, the route returns **503** (disabled).

Example:

```bash
curl -sS -X PUT "$ORIGIN/api/admin/product" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_API_SECRET" \
  -d '{"id":"mouse-1","name":"Mouse","description":"…","price":6499,"image":"https://…","category":"Peripherals"}'
```

**Note:** Deleting products that appear in **`order_lines`** will fail FK constraints; this endpoint only **upserts**.

---

## CI — API contract checks

- Script: [`scripts/check-api-contracts.ts`](../scripts/check-api-contracts.ts) — validates fallback [`src/data/products.ts`](../src/data/products.ts) against the `Product` shape and keeps small samples for **`POST /api/orders`** and Razorpay create-order payloads.
- **npm:** `npm run check:contracts`
- **GitHub:** [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) runs `check:contracts`, `lint`, and `build` on pushes and PRs to `main`.

Extend the script when you add new stable JSON APIs you want guarded in CI.

**Hands-on:** step-by-step commands in [manual-testing.md](./manual-testing.md).
