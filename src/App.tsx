import { useEffect, useRef } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { StoreProvider, useStore } from "./store/StoreContext";
import { useWebMCP } from "./hooks/useWebMCP";
import { Header } from "./components/Header";
import { ProductGrid } from "./components/ProductGrid";
import { CartView } from "./components/CartView";
import { WishlistView } from "./components/WishlistView";
import { CheckoutView } from "./components/CheckoutView";
import { OrdersView } from "./components/OrdersView";
import { DeclarativeView } from "./components/DeclarativeView";
import { QuickBuyModal } from "./components/QuickBuyModal";
import { BannerDot } from "./components/BannerDot";
import { ROUTES } from "./lib/routes";
import styles from "./App.module.css";

function ShopRoutes() {
  const { state, dispatch } = useStore();
  const location = useLocation();
  const prevPathRef = useRef(location.pathname);

  useWebMCP(state.cart, state.wishlist, dispatch, state.products, ROUTES.checkout);

  useEffect(() => {
    const prev = prevPathRef.current;
    if (prev === ROUTES.checkout && location.pathname !== ROUTES.checkout) {
      dispatch({ type: "RESET_ORDER" });
    }
    prevPathRef.current = location.pathname;
  }, [location.pathname, dispatch]);

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
        <Routes>
          <Route path={ROUTES.home} element={<ProductGrid />} />
          <Route path={ROUTES.cart} element={<CartView />} />
          <Route path={ROUTES.wishlist} element={<WishlistView />} />
          <Route path={ROUTES.checkout} element={<CheckoutView />} />
          <Route path={ROUTES.orders} element={<OrdersView />} />
          <Route path={ROUTES.declarative} element={<DeclarativeView />} />
          <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
        </Routes>
      </main>
      {state.quickBuyProductId && <QuickBuyModal />}
    </>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <ShopRoutes />
      </BrowserRouter>
    </StoreProvider>
  );
}
