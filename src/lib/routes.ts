/** Client-side URL paths (SPA). */
export const ROUTES = {
  home: "/",
  cart: "/cart",
  wishlist: "/wishlist",
  checkout: "/checkout",
  orders: "/orders",
  declarative: "/declarative",
} as const;

export type AppRoutePath = (typeof ROUTES)[keyof typeof ROUTES];
