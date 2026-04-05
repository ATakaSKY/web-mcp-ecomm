import { useStore } from "../store/StoreContext";
import { ProductCard } from "./ProductCard";
import grid from "./ProductGrid.module.css";
import views from "./views.module.css";

export function ProductGrid() {
  const { state } = useStore();
  const catalog = state.products;

  if (state.productsLoading || !catalog) {
    return (
      <section className={`${views.viewSection} ${views.emptyState}`}>
        <h2 className={views.viewTitle}>All Products</h2>
        <p>Loading catalog…</p>
      </section>
    );
  }

  if (state.productsError) {
    return (
      <section className={`${views.viewSection} ${views.emptyState}`}>
        <h2 className={views.viewTitle}>All Products</h2>
        <p className={views.errorText}>{state.productsError}</p>
      </section>
    );
  }

  return (
    <section className={views.viewSection}>
      <h2 className={views.viewTitle}>All Products</h2>
      <div className={grid.productGrid}>
        {catalog.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
