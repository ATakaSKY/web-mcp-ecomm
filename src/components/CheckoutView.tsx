import { useStore } from "../store/StoreContext";

export function CheckoutView() {
  const { state, dispatch } = useStore();

  if (!state.orderPlaced) {
    dispatch({ type: "SET_VIEW", view: "shop" });
    return null;
  }

  return (
    <section className="view-section empty-state checkout-success">
      <div className="success-icon">✓</div>
      <h2 className="view-title">Order Placed!</h2>
      <p>Thank you for your purchase. Your order has been confirmed.</p>
      <button className="btn-primary" onClick={() => dispatch({ type: "SET_VIEW", view: "shop" })}>
        Continue Shopping
      </button>
    </section>
  );
}
