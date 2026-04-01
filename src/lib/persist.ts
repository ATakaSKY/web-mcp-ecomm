import type { CartItem, Product } from "../types";

const STORAGE_KEY = "web-mcp-shop-v1";

export type PersistedShape = {
  cartLines: { productId: string; quantity: number }[];
  wishlist: string[];
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function loadPersisted(): PersistedShape {
  if (typeof localStorage === "undefined") {
    return { cartLines: [], wishlist: [] };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { cartLines: [], wishlist: [] };
    const data: unknown = JSON.parse(raw);
    if (!isRecord(data)) return { cartLines: [], wishlist: [] };

    const wishlistRaw = data.wishlist;
    const cartRaw = data.cartLines;

    const wishlist = Array.isArray(wishlistRaw)
      ? wishlistRaw.filter((id): id is string => typeof id === "string")
      : [];

    const cartLines: { productId: string; quantity: number }[] = [];
    if (Array.isArray(cartRaw)) {
      for (const entry of cartRaw) {
        if (!isRecord(entry)) continue;
        const productId = entry.productId;
        const quantity = entry.quantity;
        if (typeof productId !== "string" || typeof quantity !== "number") continue;
        if (quantity < 1 || quantity > 99) continue;
        cartLines.push({ productId, quantity });
      }
    }

    return { cartLines, wishlist };
  } catch {
    return { cartLines: [], wishlist: [] };
  }
}

export function savePersisted(p: PersistedShape): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

/** Rebuild cart items from minimal lines using the current product catalog. */
export function hydrateCart(
  lines: { productId: string; quantity: number }[],
  catalog: Product[],
): CartItem[] {
  const out: CartItem[] = [];
  for (const line of lines) {
    const product = catalog.find((p) => p.id === line.productId);
    if (product) out.push({ product, quantity: line.quantity });
  }
  return out;
}

/** Keep only wishlist ids that exist in the catalog. */
export function sanitizeWishlist(ids: string[], catalog: Product[]): string[] {
  const valid = new Set(catalog.map((p) => p.id));
  return ids.filter((id) => valid.has(id));
}
