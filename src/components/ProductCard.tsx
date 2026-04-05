import type { Product } from "../types";
import { formatInr } from "../lib/formatPrice";
import { useStore } from "../store/StoreContext";

export function ProductCard({ product }: { product: Product }) {
  const { state, dispatch } = useStore();

  const inCart = state.cart.some((i) => i.product.id === product.id);
  const wishlisted = state.wishlist.includes(product.id);

  return (
    <div className="product-card">
      <img src={product.image} alt={product.name} className="product-img" />
      <div className="product-body">
        <span className="product-category">{product.category}</span>
        <h3 className="product-name">{product.name}</h3>
        <p className="product-desc">{product.description}</p>
        <div className="product-footer">
          <span className="product-price">{formatInr(product.price)}</span>
          <div className="product-actions">
            <button
              className={`btn-icon ${wishlisted ? "wishlisted" : ""}`}
              onClick={() => dispatch({ type: "TOGGLE_WISHLIST", productId: product.id })}
              title={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
            >
              {wishlisted ? "♥" : "♡"}
            </button>
            <button
              className="btn-secondary btn-sm"
              onClick={() => dispatch({ type: "OPEN_QUICK_BUY", productId: product.id })}
            >
              Quick Buy
            </button>
            <button
              className={`btn-primary ${inCart ? "in-cart" : ""}`}
              onClick={() => dispatch({ type: "ADD_TO_CART", productId: product.id })}
            >
              {inCart ? "✓ In Cart" : "Add to Cart"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
