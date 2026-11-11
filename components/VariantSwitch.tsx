"use client";

import { useEffect, useRef } from "react";

// A family page holds every option already rendered; choosing a colour or size just shows that one, with no trip to the server.
// The address still changes (?colour=SKU) so the choice can be shared and reloaded.
export function VariantSwitch({ initial, children }: { initial: string; children: React.ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const show = (sku: string) => {
      const panes = [...el.querySelectorAll<HTMLElement>(":scope > [data-sku]")];
      const target = panes.find((p) => p.dataset.sku === sku) ?? panes.find((p) => p.dataset.sku === initial);
      if (!target) return false;
      for (const p of panes) p.hidden = p !== target;
      return true;
    };
    const fromUrl = () => show(new URLSearchParams(window.location.search).get("colour") ?? initial);
    fromUrl();
    const click = (e: MouseEvent) => {
      // Option tiles, and "Similar to this" cards that point at another option of this same page.
      const a = (e.target as HTMLElement).closest<HTMLAnchorElement>("a.variant-tile, a.product-card");
      if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const target = new URL(a.href);
      if (target.pathname !== window.location.pathname) return;
      const sku = target.searchParams.get("colour");
      if (!sku || !show(sku)) return;
      if (a.classList.contains("product-card")) window.scrollTo({ top: 0, behavior: "smooth" });
      e.preventDefault();
      e.stopPropagation();
      const u = new URL(window.location.href);
      u.searchParams.set("colour", sku);
      window.history.replaceState(window.history.state, "", u);
    };
    el.addEventListener("click", click, true);
    window.addEventListener("popstate", fromUrl);
    return () => { el.removeEventListener("click", click, true); window.removeEventListener("popstate", fromUrl); };
  }, [initial]);
  return <div ref={box}>{children}</div>;
}
