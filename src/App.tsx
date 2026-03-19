import { StoreProvider, useStore } from "./store/StoreContext";
import { useWebMCP } from "./hooks/useWebMCP";
import { Header } from "./components/Header";
import { ProductGrid } from "./components/ProductGrid";
import { CartView } from "./components/CartView";
import { WishlistView } from "./components/WishlistView";
import { CheckoutView } from "./components/CheckoutView";
import { DeclarativeView } from "./components/DeclarativeView";
import "./App.css";

function ShopApp() {
  const { state, dispatch } = useStore();

  useWebMCP(state.cart, state.wishlist, dispatch);

  return (
    <>
      <Header />
      <main className="main-content">
        <div className="webmcp-banner">
          <span className="banner-dot" />
          <span>
            <strong>WebMCP Enabled</strong> — This app exposes 6 tools via{" "}
            <code>navigator.modelContext</code>: <em>add_to_cart</em>,{" "}
            <em>remove_from_cart</em>, <em>toggle_wishlist</em>, <em>purchase</em>,{" "}
            <em>get_cart</em>, <em>get_products</em>
          </span>
        </div>
        {state.view === "shop" && <ProductGrid />}
        {state.view === "cart" && <CartView />}
        {state.view === "wishlist" && <WishlistView />}
        {state.view === "checkout" && <CheckoutView />}
        {state.view === "declarative" && <DeclarativeView />}
      </main>
    </>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <ShopApp />
    </StoreProvider>
  );
}
