import { useEffect } from "react";
import { useStore } from "../store/StoreContext";
import btn from "./buttons.module.css";
import styles from "./CheckoutView.module.css";
import views from "./views.module.css";

export function CheckoutView() {
  const { state, dispatch } = useStore();

  useEffect(() => {
    if (state.view === "checkout" && !state.orderPlaced) {
      dispatch({ type: "SET_VIEW", view: "shop" });
    }
  }, [state.view, state.orderPlaced, dispatch]);

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
      <button type="button" className={btn.btnPrimary} onClick={() => dispatch({ type: "SET_VIEW", view: "shop" })}>
        Continue Shopping
      </button>
    </section>
  );
}
