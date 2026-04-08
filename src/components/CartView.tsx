import { useState } from "react";
import { useStore } from "../store/StoreContext";
import { getApiBase } from "../lib/apiBase";
import { formatInr } from "../lib/formatPrice";
import btn from "./buttons.module.css";
import styles from "./CartView.module.css";
import views from "./views.module.css";

export function CartView() {
  const { state, dispatch, cartTotal } = useStore();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (state.cart.length === 0) {
    return (
      <section className={`${views.viewSection} ${views.emptyState}`}>
        <h2 className={views.viewTitle}>Your Cart</h2>
        <p>Your cart is empty. Start shopping!</p>
        <button type="button" className={btn.btnPrimary} onClick={() => dispatch({ type: "SET_VIEW", view: "shop" })}>
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
        credentials: "include",
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
    <section className={views.viewSection}>
      <h2 className={views.viewTitle}>Your Cart</h2>
      {err && <p className={views.errorText}>{err}</p>}
      <div className={styles.cartList}>
        {state.cart.map((item) => (
          <div key={item.product.id} className={styles.cartItem}>
            <img src={item.product.image} alt={item.product.name} className={styles.cartItemImg} />
            <div className={styles.cartItemInfo}>
              <h4>{item.product.name}</h4>
              <p className={styles.cartItemPrice}>{formatInr(item.product.price)}</p>
            </div>
            <div className={styles.cartItemControls}>
              <button
                type="button"
                className={styles.qtyBtn}
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
              <span className={styles.qtyValue}>{item.quantity}</span>
              <button
                type="button"
                className={styles.qtyBtn}
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
            <span className={styles.cartItemSubtotal}>
              {formatInr(item.product.price * item.quantity)}
            </span>
            <button
              type="button"
              className={`${btn.btnIcon} ${btn.remove}`}
              onClick={() => dispatch({ type: "REMOVE_FROM_CART", productId: item.product.id })}
              title="Remove from cart"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <div className={styles.cartSummary}>
        <div className={styles.cartTotal}>
          <span>Total</span>
          <span className={styles.totalPrice}>{formatInr(cartTotal)}</span>
        </div>
        <button
          type="button"
          className={`${btn.btnPrimary} ${btn.btnCheckout}`}
          disabled={busy}
          onClick={() => void checkout()}
        >
          {busy ? "Placing order…" : "Complete Purchase"}
        </button>
      </div>
    </section>
  );
}
