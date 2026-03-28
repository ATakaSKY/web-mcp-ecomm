export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export type View = "shop" | "cart" | "wishlist" | "checkout" | "declarative";

export type StoreAction =
  | { type: "ADD_TO_CART"; productId: string; quantity?: number }
  | { type: "REMOVE_FROM_CART"; productId: string }
  | { type: "UPDATE_QUANTITY"; productId: string; quantity: number }
  | { type: "TOGGLE_WISHLIST"; productId: string }
  | { type: "PURCHASE" }
  | { type: "SET_VIEW"; view: View }
  | { type: "RESET_ORDER" }
  | { type: "OPEN_QUICK_BUY"; productId: string }
  | { type: "CLOSE_QUICK_BUY" };
