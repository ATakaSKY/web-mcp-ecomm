import { useStore } from "../store/StoreContext";

export function CartView() {
  const { state, dispatch, cartTotal } = useStore();

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

  return (
    <section className="view-section">
      <h2 className="view-title">Your Cart</h2>
      <div className="cart-list">
        {state.cart.map((item) => (
          <div key={item.product.id} className="cart-item">
            <img src={item.product.image} alt={item.product.name} className="cart-item-img" />
            <div className="cart-item-info">
              <h4>{item.product.name}</h4>
              <p className="cart-item-price">${item.product.price.toFixed(2)}</p>
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
              ${(item.product.price * item.quantity).toFixed(2)}
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
          <span className="total-price">${cartTotal.toFixed(2)}</span>
        </div>
        <button className="btn-primary btn-checkout" onClick={() => dispatch({ type: "PURCHASE" })}>
          Complete Purchase
        </button>
      </div>
    </section>
  );
}
