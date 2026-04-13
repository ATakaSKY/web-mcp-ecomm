import { useEffect, useState } from "react";
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
  const [checkoutWasRazorpaySkip] = useState(() => {
    try {
      if (typeof sessionStorage === "undefined") return false;
      const v = sessionStorage.getItem("checkoutRazorpaySkipped") === "1";
      if (v) sessionStorage.removeItem("checkoutRazorpaySkipped");
      return v;
    } catch {
      return false;
    }
  });

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
      <h2 className={views.viewTitle}>
        {checkoutWasRazorpaySkip ? "Order placed" : "Payment received"}
      </h2>
      <p>
        {checkoutWasRazorpaySkip
          ? "Your order is saved as pending. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to collect payment via Razorpay (UPI, cards, netbanking)."
          : "Thank you for your purchase. Your order is confirmed and marked paid in INR via Razorpay."}
      </p>
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
