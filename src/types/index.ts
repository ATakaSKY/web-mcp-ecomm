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

export type View =
  | "shop"
  | "cart"
  | "wishlist"
  | "checkout"
  | "declarative"
  | "orders";

export type OrderStatus = "pending" | "paid" | "fulfilled";

export interface UserOrderLine {
  quantity: number;
  unitPrice: number;
  product: Pick<Product, "id" | "name" | "image">;
}

export interface UserOrder {
  id: string;
  status: OrderStatus;
  totalPaise: number;
  createdAt: string | null;
  lines: UserOrderLine[];
}

export type StoreAction =
  | { type: "ADD_TO_CART"; productId: string; quantity?: number }
  | { type: "REMOVE_FROM_CART"; productId: string }
  | { type: "UPDATE_QUANTITY"; productId: string; quantity: number }
  | { type: "TOGGLE_WISHLIST"; productId: string }
  | { type: "SET_PRODUCTS"; products: Product[] }
  | { type: "SET_PRODUCTS_ERROR"; error: string }
  | { type: "PURCHASE_SUCCESS"; orderId: string }
  | { type: "QUICK_BUY_ORDER_SUCCESS"; orderId: string }
  | { type: "SET_VIEW"; view: View }
  | { type: "RESET_ORDER" }
  | { type: "OPEN_QUICK_BUY"; productId: string }
  | { type: "CLOSE_QUICK_BUY" };
