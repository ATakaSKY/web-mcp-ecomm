import { products } from "../data/products";
import { ProductCard } from "./ProductCard";

export function ProductGrid() {
  return (
    <section className="view-section">
      <h2 className="view-title">All Products</h2>
      <div className="product-grid">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
