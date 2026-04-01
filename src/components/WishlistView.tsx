import { useStore } from "../store/StoreContext";
import { ProductCard } from "./ProductCard";

export function WishlistView() {
  const { state, dispatch } = useStore();
  const catalog = state.products ?? [];
  const wishlisted = catalog.filter((p) => state.wishlist.includes(p.id));

  if (state.productsLoading) {
    return (
      <section className="view-section empty-state">
        <h2 className="view-title">Your Wishlist</h2>
        <p>Loading…</p>
      </section>
    );
  }

  if (wishlisted.length === 0) {
    return (
      <section className="view-section empty-state">
        <h2 className="view-title">Your Wishlist</h2>
        <p>No items in your wishlist yet.</p>
        <button className="btn-primary" onClick={() => dispatch({ type: "SET_VIEW", view: "shop" })}>
          Browse Products
        </button>
      </section>
    );
  }

  return (
    <section className="view-section">
      <h2 className="view-title">Your Wishlist</h2>
      <div className="product-grid">
        {wishlisted.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
