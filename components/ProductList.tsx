"use client";

import { useEffect, useMemo, useState } from "react";
import type { Product } from "@/lib/catalogue";
import { SIZES, SORTS, sizeOf, sortProducts } from "@/lib/sizes";
import { ProductGrid } from "./ProductGrid";

const split = (s: string) => s.split(",").map((v) => v.trim()).filter(Boolean);

// Sort and filter bar for category, collection and gift pages.
export function ProductList({ products, defaultSort = "featured" }: { products: Product[]; defaultSort?: string }) {
  const [sort, setSort] = useState(defaultSort);
  const [colour, setColour] = useState("");
  const [size, setSize] = useState("");

  useEffect(() => {
    const u = new URLSearchParams(window.location.search);
    setSort(u.get("sort") ?? defaultSort);
    setColour(u.get("colour") ?? "");
    setSize(u.get("size") ?? "");
  }, [defaultSort]);

  useEffect(() => {
    const u = new URLSearchParams(window.location.search);
    for (const [k, v, d] of [["sort", sort, defaultSort], ["colour", colour, ""], ["size", size, ""]] as const) { if (v && v !== d) u.set(k, v); else u.delete(k); }
    const q = u.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${q ? `?${q}` : ""}`);
  }, [sort, colour, size, defaultSort]);

  const colours = useMemo(() => [...new Set(products.flatMap((p) => split(p.colours)))].sort(), [products]);
  const sizes = useMemo(() => SIZES.filter(([id]) => products.some((p) => sizeOf(p) === id)), [products]);
  const shown = useMemo(() => sortProducts(products.filter((p) => (!colour || split(p.colours).includes(colour)) && (!size || sizeOf(p) === size)), sort), [products, sort, colour, size]);

  return (
    <>
      <div className="shop-toolbar list-toolbar">
        <span role="status">{shown.length} {shown.length === 1 ? "piece" : "pieces"}</span>
        <div className="list-controls">
          {colours.length > 1 && <label>Colour <select value={colour} onChange={(e) => setColour(e.target.value)}><option value="">All</option>{colours.map((c) => <option key={c}>{c}</option>)}</select></label>}
          {sizes.length > 1 && <label>Size <select value={size} onChange={(e) => setSize(e.target.value)}><option value="">All</option>{sizes.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>}
          <label>Sort by <select value={sort} onChange={(e) => setSort(e.target.value)}>{SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        </div>
      </div>
      {shown.length ? <ProductGrid products={shown} /> : <p className="empty">Nothing matches that filter. <button type="button" className="link-button" onClick={() => { setColour(""); setSize(""); }}>Clear filters</button></p>}
    </>
  );
}
