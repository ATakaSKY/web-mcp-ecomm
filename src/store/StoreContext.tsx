import { createContext, useContext, useReducer, type ReactNode } from "react";
import type { CartItem, Product, StoreAction, View } from "../types";
import { products } from "../data/products";

interface State {
  cart: CartItem[];
  wishlist: string[]; // product IDs
  view: View;
  orderPlaced: boolean;
  quickBuyProductId: string | null;
}

const initialState: State = {
  cart: [],
  wishlist: [],
  view: "shop",
  orderPlaced: false,
  quickBuyProductId: null,
};

function findProduct(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}

function reducer(state: State, action: StoreAction): State {
  switch (action.type) {
    case "ADD_TO_CART": {
      const product = findProduct(action.productId);
      if (!product) return state;
      const existing = state.cart.find((i) => i.product.id === action.productId);
      if (existing) {
        return {
          ...state,
          cart: state.cart.map((i) =>
            i.product.id === action.productId
              ? { ...i, quantity: i.quantity + (action.quantity ?? 1) }
              : i
          ),
        };
      }
      return {
        ...state,
        cart: [...state.cart, { product, quantity: action.quantity ?? 1 }],
      };
    }
    case "REMOVE_FROM_CART":
      return {
        ...state,
        cart: state.cart.filter((i) => i.product.id !== action.productId),
      };
    case "UPDATE_QUANTITY": {
      if (action.quantity <= 0) {
        return { ...state, cart: state.cart.filter((i) => i.product.id !== action.productId) };
      }
      return {
        ...state,
        cart: state.cart.map((i) =>
          i.product.id === action.productId ? { ...i, quantity: action.quantity } : i
        ),
      };
    }
    case "TOGGLE_WISHLIST": {
      const exists = state.wishlist.includes(action.productId);
      return {
        ...state,
        wishlist: exists
          ? state.wishlist.filter((id) => id !== action.productId)
          : [...state.wishlist, action.productId],
      };
    }
    case "PURCHASE":
      return { ...state, cart: [], orderPlaced: true, view: "checkout" };
    case "SET_VIEW":
      return { ...state, view: action.view, orderPlaced: false };
    case "RESET_ORDER":
      return { ...state, orderPlaced: false };
    case "OPEN_QUICK_BUY":
      return { ...state, quickBuyProductId: action.productId };
    case "CLOSE_QUICK_BUY":
      return { ...state, quickBuyProductId: null };
    default:
      return state;
  }
}

interface StoreContextValue {
  state: State;
  dispatch: React.Dispatch<StoreAction>;
  cartTotal: number;
  cartCount: number;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const cartTotal = state.cart.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const cartCount = state.cart.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <StoreContext.Provider value={{ state, dispatch, cartTotal, cartCount }}>
      {children}
    </StoreContext.Provider>
  );
}

/** Companion hook for {@link StoreProvider}; colocated for a single context module. */
// eslint-disable-next-line react-refresh/only-export-components -- allow useStore next to provider
export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be inside StoreProvider");
  return ctx;
}
