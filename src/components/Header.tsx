import { useStore } from "../store/StoreContext";
import type { View } from "../types";

export function Header() {
  const { state, dispatch, cartCount } = useStore();

  const nav = (view: View) => () => dispatch({ type: "SET_VIEW", view });
  const active = (v: View) => (state.view === v ? "nav-btn active" : "nav-btn");

  return (
    <header className="app-header">
      <button className="logo" onClick={nav("shop")}>
        ⚡ WebMCP Shop
      </button>
      <nav>
        <button className={active("shop")} onClick={nav("shop")}>
          Products
        </button>
        <button className={active("wishlist")} onClick={nav("wishlist")}>
          ♥ Wishlist
          {state.wishlist.length > 0 && <span className="badge">{state.wishlist.length}</span>}
        </button>
        <button className={active("cart")} onClick={nav("cart")}>
          🛒 Cart
          {cartCount > 0 && <span className="badge">{cartCount}</span>}
        </button>
        <span className="nav-divider" />
        <button className={active("declarative")} onClick={nav("declarative")}>
          📋 Declarative API
        </button>
      </nav>
    </header>
  );
}
