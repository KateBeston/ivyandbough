"use client";

import { useEffect, useMemo, useState } from "react";
import type { Category, Product, Theme } from "@/lib/catalogue";
import { ProductGrid } from "./ProductGrid";

type Filters = { q: string; sort: string; category: string[]; collection: string[]; colour: string[]; material: string[]; price: string[]; offer: string[] };
const blank: Filters = { q: "", sort: "featured", category: [], collection: [], colour: [], material: [], price: [], offer: [] };
const lists = ["category", "collection", "colour", "material", "price", "offer"] as const;
const sorts = [["featured", "Featured"], ["newest", "Newest"], ["low", "Price: low to high"], ["high", "Price: high to low"], ["az", "Name: A to Z"]];
const prices: [string, string, number, number][] = [["under50", "Under $50", 0, 5000], ["50-100", "$50 to $100", 5000, 10000], ["100-200", "$100 to $200", 10000, 20000], ["200", "$200 and over", 20000, Infinity]];
const colourList = ["Red", "Burgundy", "Green", "Gold", "Silver", "White", "Ivory", "Champagne", "Blush", "Pink", "Blue", "Black", "Brown", "Natural", "Multicolour"];
const split = (s: string) => s.split(",").map((v) => v.trim()).filter(Boolean);

function Group({ title, open = false, children }: { title: string; open?: boolean; children: React.ReactNode }) {
  return <details className="filter-group" open={open}><summary>{title}</summary><div>{children}</div></details>;
}

export function ShopBrowser({ products, categories, themes }: { products: Product[]; categories: Category[]; themes: Theme[] }) {
  const [f, setF] = useState<Filters>(blank);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const u = new URLSearchParams(window.location.search);
    const next = { ...blank, q: u.get("q") ?? "", sort: u.get("sort") ?? "featured" };
    for (const k of lists) next[k] = u.get(k)?.split("|").filter(Boolean) ?? [];
    setF(next);
  }, []);

  useEffect(() => {
    const u = new URLSearchParams();
    if (f.q) u.set("q", f.q);
    if (f.sort !== "featured") u.set("sort", f.sort);
    for (const k of lists) if (f[k].length) u.set(k, f[k].join("|"));
    const q = u.toString();
    window.history.replaceState(null, "", q ? `/shop?${q}` : "/shop");
  }, [f]);

  const toggle = (key: (typeof lists)[number], value: string) => setF((s) => ({ ...s, [key]: s[key].includes(value) ? s[key].filter((v) => v !== value) : [...s[key], value] }));
  const mains = categories.filter((c) => !c.parent_id);
  const byId = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const offers = useMemo(() => ["Sale", "Clearance"].filter((k) => products.some((p) => p.sale_label === k)), [products]);
  const materials = useMemo(() => [...new Set(products.flatMap((p) => split(p.materials)))].sort(), [products]);

  const results = useMemo(() => {
    const words = f.q.toLowerCase().split(/\s+/).filter(Boolean);
    const list = products.filter((p) => {
      const text = `${p.name} ${p.description} ${p.kind} ${p.materials} ${p.colours}`.toLowerCase();
      if (!words.every((w) => text.includes(w))) return false;
      const cat = p.category_id ? byId.get(p.category_id) : undefined;
      if (f.category.length && !(cat && (f.category.includes(cat.slug) || f.category.includes(byId.get(cat.parent_id ?? "")?.slug ?? "")))) return false;
      if (f.collection.length && !f.collection.includes(p.themes?.slug ?? "")) return false;
      if (f.colour.length && !split(p.colours).some((c) => f.colour.includes(c))) return false;
      if (f.material.length && !split(p.materials).some((m) => f.material.includes(m))) return false;
      if (f.offer.length && !f.offer.includes(p.sale_label)) return false;
      if (f.price.length) {
        const price = p.price_cents;
        if (price === null || !prices.some(([id, , lo, hi]) => f.price.includes(id) && price >= lo && price < hi)) return false;
      }
      return true;
    });
    const money = (p: Product, none: number) => p.price_cents ?? none;
    if (f.sort === "newest") list.sort((a, b) => b.created_at.localeCompare(a.created_at));
    if (f.sort === "low") list.sort((a, b) => money(a, Infinity) - money(b, Infinity));
    if (f.sort === "high") list.sort((a, b) => money(b, -1) - money(a, -1));
    if (f.sort === "az") list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [products, byId, f]);

  const check = (key: (typeof lists)[number], value: string, label: string) => (
    <label key={value} className="filter-check"><input type="checkbox" checked={f[key].includes(value)} onChange={() => toggle(key, value)} /> {label}</label>
  );
  const active = !!f.q || lists.some((k) => f[k].length);

  return (
    <main className="shop-browser">
      <h1 className="heading">Shop everything</h1>
      <div className="shop-layout">
        <div className="filter-panel">
          <button type="button" className="filter-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>Filter</button>
          <div className={`filter-inner${open ? " open" : ""}`}>
            <label className="filter-search">Search<input type="search" value={f.q} placeholder="Search products" onChange={(e) => setF({ ...f, q: e.target.value })} /></label>
            <Group title="Category" open>
              {mains.map((m) => (
                <div key={m.id}>
                  {check("category", m.slug, m.name)}
                  {f.category.includes(m.slug) && <div className="filter-sub">{categories.filter((c) => c.parent_id === m.id).map((c) => check("category", c.slug, c.name))}</div>}
                </div>
              ))}
            </Group>
            <Group title="Collection">{themes.map((t) => check("collection", t.slug, t.name))}</Group>
            <Group title="Colour">{colourList.map((c) => check("colour", c, c))}</Group>
            {materials.length > 0 && <Group title="Material">{materials.map((m) => check("material", m, m))}</Group>}
            <Group title="Price">{prices.map(([id, label]) => check("price", id, label))}</Group>
            {offers.length > 0 && <Group title="Offers">{offers.map((o) => check("offer", o, o))}</Group>}
            {active && <button type="button" className="link-button" onClick={() => setF({ ...blank, sort: f.sort })}>Clear all filters</button>}
          </div>
        </div>
        <div className="shop-results">
          <div className="shop-toolbar">
            <span role="status">{results.length} {results.length === 1 ? "piece" : "pieces"}</span>
            <label>Sort by <select value={f.sort} onChange={(e) => setF({ ...f, sort: e.target.value })}>{sorts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
          </div>
          {results.length ? <ProductGrid products={results} /> : <p className="empty">Nothing matches those filters yet. Try removing one.</p>}
        </div>
      </div>
    </main>
  );
}
