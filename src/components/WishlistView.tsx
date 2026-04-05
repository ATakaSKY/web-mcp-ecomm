import { useStore } from "../store/StoreContext";
import { ProductCard } from "./ProductCard";
import btn from "./buttons.module.css";
import grid from "./ProductGrid.module.css";
import views from "./views.module.css";

export function WishlistView() {
  const { state, dispatch } = useStore();
  const catalog = state.products ?? [];
  const wishlisted = catalog.filter((p) => state.wishlist.includes(p.id));

  if (state.productsLoading) {
    return (
      <section className={`${views.viewSection} ${views.emptyState}`}>
        <h2 className={views.viewTitle}>Your Wishlist</h2>
        <p>Loading…</p>
      </section>
    );
  }

  if (wishlisted.length === 0) {
    return (
      <section className={`${views.viewSection} ${views.emptyState}`}>
        <h2 className={views.viewTitle}>Your Wishlist</h2>
        <p>No items in your wishlist yet.</p>
        <button type="button" className={btn.btnPrimary} onClick={() => dispatch({ type: "SET_VIEW", view: "shop" })}>
          Browse Products
        </button>
      </section>
    );
  }

  return (
    <section className={views.viewSection}>
      <h2 className={views.viewTitle}>Your Wishlist</h2>
      <div className={grid.productGrid}>
        {wishlisted.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
