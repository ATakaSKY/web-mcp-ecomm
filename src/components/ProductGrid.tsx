import { useStore } from "../store/StoreContext";
import { ProductCard } from "./ProductCard";

export function ProductGrid() {
  const { state } = useStore();
  const catalog = state.products;

  if (state.productsLoading || !catalog) {
    return (
      <section className="view-section empty-state">
        <h2 className="view-title">All Products</h2>
        <p>Loading catalog…</p>
      </section>
    );
  }

  if (state.productsError) {
    return (
      <section className="view-section empty-state">
        <h2 className="view-title">All Products</h2>
        <p className="error-text">{state.productsError}</p>
      </section>
    );
  }

  return (
    <section className="view-section">
      <h2 className="view-title">All Products</h2>
      <div className="product-grid">
        {catalog.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
