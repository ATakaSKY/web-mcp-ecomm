import { StoreProvider, useStore } from "./store/StoreContext";
import { useWebMCP } from "./hooks/useWebMCP";
import { Header } from "./components/Header";
import { ProductGrid } from "./components/ProductGrid";
import { CartView } from "./components/CartView";
import { WishlistView } from "./components/WishlistView";
import { CheckoutView } from "./components/CheckoutView";
import { DeclarativeView } from "./components/DeclarativeView";
import { QuickBuyModal } from "./components/QuickBuyModal";
import { BannerDot } from "./components/BannerDot";
import styles from "./App.module.css";

function ShopApp() {
  const { state, dispatch } = useStore();

  useWebMCP(state.cart, state.wishlist, dispatch, state.products);

  return (
    <>
      <Header />
      <main className={styles.mainContent}>
        <div className={styles.webmcpBanner}>
          <BannerDot />
          <span>
            <strong>WebMCP Enabled</strong> — imperative tools (registered when the catalog loads) +{" "}
            declarative form tools via <code>navigator.modelContext</code>.{" "}
            Try <em>open_quick_buy</em> to see a modal with dynamic tool registration.
          </span>
        </div>
        {state.view === "shop" && <ProductGrid />}
        {state.view === "cart" && <CartView />}
        {state.view === "wishlist" && <WishlistView />}
        {state.view === "checkout" && <CheckoutView />}
        {state.view === "declarative" && <DeclarativeView />}
      </main>
      {state.quickBuyProductId && <QuickBuyModal />}
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
