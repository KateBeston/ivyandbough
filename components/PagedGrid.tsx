"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/lib/catalogue";
import { ProductGrid } from "./ProductGrid";

const PAGE = 48;

// Shows products 48 at a time so big listing pages stay small and fast. Sorting and filters still cover every product.
export function PagedGrid({ products }: { products: Product[] }) {
  const [count, setCount] = useState(PAGE);
  useEffect(() => setCount(PAGE), [products]);
  const shown = products.slice(0, count);
  return (
    <>
      <ProductGrid products={shown} />
      {products.length > count && (
        <div className="show-more">
          <p>Showing {shown.length} of {products.length}</p>
          <button type="button" className="solid" onClick={() => setCount((c) => c + PAGE)}>Show more</button>
        </div>
      )}
    </>
  );
}
