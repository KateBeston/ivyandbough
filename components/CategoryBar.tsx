"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import type { Category } from "@/lib/catalogue";

export function CategoryBar({ categories }: { categories: Category[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const bar = useRef<HTMLElement>(null);
  const pointer = useRef("");
  const parents = categories.filter((c) => !c.parent_id);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(null); };
    const outside = (e: MouseEvent) => { if (!bar.current?.contains(e.target as Node)) setOpen(null); };
    window.addEventListener("keydown", esc);
    document.addEventListener("click", outside);
    return () => { window.removeEventListener("keydown", esc); document.removeEventListener("click", outside); };
  }, []);

  if (!parents.length) return null;

  const mouse = (e: PointerEvent, id: string | null) => { if (e.pointerType === "mouse") setOpen(id); };

  return (
    <nav ref={bar} className="category-bar" aria-label="Shop by category">
      <h2 className="heading">Explore all categories</h2>
      <ul>
        {parents.map((p) => {
          const kids = categories.filter((c) => c.parent_id === p.id);
          const isOpen = open === p.id;
          return (
            <li key={p.id} onPointerEnter={(e) => mouse(e, p.id)} onPointerLeave={(e) => mouse(e, null)}>
              <div className="category-top">
                <Link href={`/shop/${p.slug}`}>{p.name}</Link>
                {kids.length > 0 && (
                  <button type="button" aria-expanded={isOpen} aria-label={`${isOpen ? "Hide" : "Show"} ${p.name} categories`} onPointerDown={(e) => { pointer.current = e.pointerType; }} onClick={() => setOpen(pointer.current === "mouse" || !isOpen ? p.id : null)}>
                    <svg width="10" height="6" viewBox="0 0 10 6" aria-hidden="true"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.3" /></svg>
                  </button>
                )}
              </div>
              {isOpen && kids.length > 0 && (
                <ul className="category-drop">
                  {kids.map((k) => <li key={k.id}><Link href={`/shop/${k.slug}`}>{k.name}</Link></li>)}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
