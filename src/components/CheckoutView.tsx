import { useEffect } from "react";
import { useStore } from "../store/StoreContext";

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
    <section className="view-section empty-state checkout-success">
      <div className="success-icon">✓</div>
      <h2 className="view-title">Order Placed!</h2>
      <p>Thank you for your purchase. Your order has been confirmed.</p>
      {state.lastOrderId && (
        <p className="order-id">
          Order ID: <code>{state.lastOrderId}</code>
        </p>
      )}
      <button className="btn-primary" onClick={() => dispatch({ type: "SET_VIEW", view: "shop" })}>
        Continue Shopping
      </button>
    </section>
  );
}
