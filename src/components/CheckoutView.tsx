import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useStore } from "../store/StoreContext";
import { ROUTES } from "../lib/routes";
import btn from "./buttons.module.css";
import styles from "./CheckoutView.module.css";
import views from "./views.module.css";

export function CheckoutView() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { state } = useStore();

  useEffect(() => {
    if (pathname === ROUTES.checkout && !state.orderPlaced) {
      navigate(ROUTES.home, { replace: true });
    }
  }, [pathname, state.orderPlaced, navigate]);

  if (!state.orderPlaced) {
    return null;
  }

  return (
    <section className={`${views.viewSection} ${views.emptyState} ${styles.checkoutSuccess}`}>
      <div className={styles.successIcon}>✓</div>
      <h2 className={views.viewTitle}>Order Placed!</h2>
      <p>Thank you for your purchase. Your order has been confirmed.</p>
      {state.lastOrderId && (
        <p className={styles.orderId}>
          Order ID: <code>{state.lastOrderId}</code>
        </p>
      )}
      <button type="button" className={btn.btnPrimary} onClick={() => navigate(ROUTES.home)}>
        Continue Shopping
      </button>
    </section>
  );
}
