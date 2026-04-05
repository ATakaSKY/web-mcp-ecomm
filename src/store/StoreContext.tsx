import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  type ReactNode,
} from "react";
import type { CartItem, Product, StoreAction, View } from "../types";
import { getApiBase } from "../lib/apiBase";
import { hydrateCart, loadPersisted, sanitizeWishlist, savePersisted } from "../lib/persist";

interface State {
  products: Product[] | null;
  productsLoading: boolean;
  productsError: string | null;
  cart: CartItem[];
  wishlist: string[]; // product IDs
  view: View;
  orderPlaced: boolean;
  lastOrderId: string | null;
  quickBuyProductId: string | null;
}

function init(): State {
  const persisted = loadPersisted();
  return {
    products: null,
    productsLoading: true,
    productsError: null,
    cart: [],
    wishlist: persisted.wishlist,
    view: "shop",
    orderPlaced: false,
    lastOrderId: null,
    quickBuyProductId: null,
  };
}

function findProduct(state: State, id: string): Product | undefined {
  return state.products?.find((p) => p.id === id);
}

function reducer(state: State, action: StoreAction): State {
  switch (action.type) {
    case "SET_PRODUCTS": {
      const persisted = loadPersisted();
      const catalog = action.products;
      const wishlist = sanitizeWishlist(persisted.wishlist, catalog);
      const cart = hydrateCart(persisted.cartLines, catalog);
      return {
        ...state,
        products: catalog,
        productsLoading: false,
        productsError: null,
        wishlist,
        cart,
      };
    }
    case "SET_PRODUCTS_ERROR":
      return {
        ...state,
        productsLoading: false,
        productsError: action.error,
      };
    case "ADD_TO_CART": {
      const product = findProduct(state, action.productId);
      if (!product) return state;
      const existing = state.cart.find((i) => i.product.id === action.productId);
      if (existing) {
        return {
          ...state,
          cart: state.cart.map((i) =>
            i.product.id === action.productId
              ? { ...i, quantity: i.quantity + (action.quantity ?? 1) }
              : i,
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
          i.product.id === action.productId ? { ...i, quantity: action.quantity } : i,
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
    case "PURCHASE_SUCCESS":
      return {
        ...state,
        cart: [],
        orderPlaced: true,
        view: "checkout",
        lastOrderId: action.orderId,
      };
    case "QUICK_BUY_ORDER_SUCCESS":
      return {
        ...state,
        orderPlaced: true,
        lastOrderId: action.orderId,
      };
    case "SET_VIEW":
      return {
        ...state,
        view: action.view,
        orderPlaced: false,
        lastOrderId: null,
      };
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
  const [state, dispatch] = useReducer(reducer, undefined, init);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const base = getApiBase();
      try {
        const res = await fetch(`${base}/api/products`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: unknown = await res.json();
        if (!Array.isArray(data)) throw new Error("Invalid catalog response");
        if (!cancelled) dispatch({ type: "SET_PRODUCTS", products: data as Product[] });
      } catch {
        try {
          const mod = await import("../data/products");
          if (!cancelled) dispatch({ type: "SET_PRODUCTS", products: mod.products });
        } catch {
          if (!cancelled)
            dispatch({
              type: "SET_PRODUCTS_ERROR",
              error: "Could not load products",
            });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!state.products) return;
    savePersisted({
      cartLines: state.cart.map((i) => ({
        productId: i.product.id,
        quantity: i.quantity,
      })),
      wishlist: state.wishlist,
    });
  }, [state.products, state.cart, state.wishlist]);

  const cartTotal = state.cart.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const cartCount = state.cart.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <StoreContext.Provider value={{ state, dispatch, cartTotal, cartCount }}>
      {children}
    </StoreContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- allow useStore next to provider
export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be inside StoreProvider");
  return ctx;
}
