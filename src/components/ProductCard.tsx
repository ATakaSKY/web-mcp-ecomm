import type { Product } from "../types";
import { formatInr } from "../lib/formatPrice";
import { useStore } from "../store/StoreContext";
import btn from "./buttons.module.css";
import { ProductImage } from "./ProductImage";
import styles from "./ProductCard.module.css";

export function ProductCard({ product }: { product: Product }) {
  const { state, dispatch } = useStore();

  const inCart = state.cart.some((i) => i.product.id === product.id);
  const wishlisted = state.wishlist.includes(product.id);

  return (
    <div className={styles.productCard}>
      <ProductImage src={product.image} alt={product.name} className={styles.productImg} />
      <div className={styles.productBody}>
        <span className={styles.productCategory}>{product.category}</span>
        <h3 className={styles.productName}>{product.name}</h3>
        <p className={styles.productDesc}>{product.description}</p>
        <div className={styles.productFooter}>
          <span className={styles.productPrice}>{formatInr(product.price)}</span>
          <div className={styles.productActions}>
            <button
              type="button"
              className={`${btn.btnIcon}${wishlisted ? ` ${btn.wishlisted}` : ""}`}
              onClick={() => dispatch({ type: "TOGGLE_WISHLIST", productId: product.id })}
              title={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
            >
              {wishlisted ? "♥" : "♡"}
            </button>
            <button
              type="button"
              className={`${btn.btnSecondary} ${btn.btnSm}`}
              onClick={() => dispatch({ type: "OPEN_QUICK_BUY", productId: product.id })}
            >
              Quick Buy
            </button>
            <button
              type="button"
              className={`${btn.btnPrimary}${inCart ? ` ${btn.inCart}` : ""}`}
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
