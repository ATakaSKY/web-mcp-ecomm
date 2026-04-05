import { useState } from "react";
import { useStore } from "../store/StoreContext";
import { getApiBase } from "../lib/apiBase";
import { formatInr } from "../lib/formatPrice";

export function CartView() {
  const { state, dispatch, cartTotal } = useStore();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (state.cart.length === 0) {
    return (
      <section className="view-section empty-state">
        <h2 className="view-title">Your Cart</h2>
        <p>Your cart is empty. Start shopping!</p>
        <button className="btn-primary" onClick={() => dispatch({ type: "SET_VIEW", view: "shop" })}>
          Browse Products
        </button>
      </section>
    );
  }

  async function checkout() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`${getApiBase()}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: state.cart.map((i) => ({
            productId: i.product.id,
            quantity: i.quantity,
          })),
        }),
      });
      const data = (await res.json()) as { error?: string; orderId?: string };
      if (!res.ok) {
        setErr(data.error ?? "Checkout failed");
        return;
      }
      if (!data.orderId) {
        setErr("Invalid response from server");
        return;
      }
      dispatch({ type: "PURCHASE_SUCCESS", orderId: data.orderId });
    } catch {
      setErr("Network error. Use vercel dev with DATABASE_URL for orders, or check your connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="view-section">
      <h2 className="view-title">Your Cart</h2>
      {err && <p className="error-text">{err}</p>}
      <div className="cart-list">
        {state.cart.map((item) => (
          <div key={item.product.id} className="cart-item">
            <img src={item.product.image} alt={item.product.name} className="cart-item-img" />
            <div className="cart-item-info">
              <h4>{item.product.name}</h4>
              <p className="cart-item-price">{formatInr(item.product.price)}</p>
            </div>
            <div className="cart-item-controls">
              <button
                className="qty-btn"
                onClick={() =>
                  dispatch({
                    type: "UPDATE_QUANTITY",
                    productId: item.product.id,
                    quantity: item.quantity - 1,
                  })
                }
              >
                −
              </button>
              <span className="qty-value">{item.quantity}</span>
              <button
                className="qty-btn"
                onClick={() =>
                  dispatch({
                    type: "UPDATE_QUANTITY",
                    productId: item.product.id,
                    quantity: item.quantity + 1,
                  })
                }
              >
                +
              </button>
            </div>
            <span className="cart-item-subtotal">
              {formatInr(item.product.price * item.quantity)}
            </span>
            <button
              className="btn-icon remove"
              onClick={() => dispatch({ type: "REMOVE_FROM_CART", productId: item.product.id })}
              title="Remove from cart"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <div className="cart-summary">
        <div className="cart-total">
          <span>Total</span>
          <span className="total-price">{formatInr(cartTotal)}</span>
        </div>
        <button
          className="btn-primary btn-checkout"
          type="button"
          disabled={busy}
          onClick={() => void checkout()}
        >
          {busy ? "Placing order…" : "Complete Purchase"}
        </button>
      </div>
    </section>
  );
}
