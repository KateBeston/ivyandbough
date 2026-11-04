"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type FocusEvent, type PointerEvent } from "react";
import type { Category, Theme } from "@/lib/catalogue";
import { useBasket } from "./BasketProvider";

type Panel = "themes" | "shop" | null;

export function Nav({ themes, categories, solid = false, showLogo = true }: { themes: Theme[]; categories: Category[]; solid?: boolean; showLogo?: boolean }) {
  const { count } = useBasket();
  const [panel, setPanel] = useState<Panel>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  // A new page can load under a resting cursor. The menu waits until the cursor has
  // left the link and come back, so it can't reopen over the page just clicked through to.
  const hoverReady = useRef(false);

  useEffect(() => {
    const arm = (e: globalThis.PointerEvent) => {
      if (!(e.target instanceof Element && e.target.closest(".menu a"))) hoverReady.current = true;
    };
    window.addEventListener("pointermove", arm);
    return () => window.removeEventListener("pointermove", arm);
  }, []);

  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPanel(null);
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

  const closeAll = () => {
    hoverReady.current = false;
    setPanel(null);
    setMobileOpen(false);
  };
  const hoverOpen = (name: Panel) => (e: PointerEvent) => { if (e.pointerType === "mouse" && hoverReady.current) setPanel(name); };
  const focusOpen = (name: Panel) => (e: FocusEvent<HTMLElement>) => { if (e.currentTarget.matches(":focus-visible")) setPanel(name); };
  const mains = categories.filter((c) => !c.parent_id);

  return (
    <div className={`site-nav ${solid ? "nav-solid" : "nav-light"}${showLogo ? "" : " no-logo"}`} onMouseLeave={() => setPanel(null)}>
      <header className="nav">
        <button type="button" className="menu-toggle" aria-expanded={mobileOpen} aria-controls="main-menu" onClick={() => setMobileOpen(!mobileOpen)}>Menu</button>
        {showLogo && <Link href="/" className="logo" aria-label="Ivy &amp; Bough home"><img src="/brand/stacked-ink.svg" alt="" width={120} height={70} /></Link>}
        <nav id="main-menu" aria-label="Main" className={`menu${mobileOpen ? " open" : ""}`}>
          <Link href="/collections" onClick={closeAll} onPointerEnter={hoverOpen("themes")} onFocus={focusOpen("themes")}>Collections</Link>
          <Link href="/shop" onClick={closeAll} onPointerEnter={hoverOpen("shop")} onFocus={focusOpen("shop")}>Shop</Link>
          <Link href="/the-christmas-edit" onClick={closeAll} onMouseEnter={() => setPanel(null)}>The Christmas Edit</Link>
          <Link href="/about" onClick={closeAll} onMouseEnter={() => setPanel(null)}>About</Link>
          <Link href="/delivery" onClick={closeAll} onMouseEnter={() => setPanel(null)}>Delivery</Link>
          <Link href="/contact" onClick={closeAll} onMouseEnter={() => setPanel(null)}>Contact</Link>
        </nav>
        <div className="nav-tools">
          <form action="/search" role="search" className="nav-search"><input type="search" name="q" placeholder="Search" aria-label="Search the site" /><button type="submit">Go</button></form>
          <Link href="/account">Account</Link>
          <Link href="/basket">Basket ({count})</Link>
        </div>
      </header>
      {panel === "themes" && (
        <div id="nav-panel" className="themes-menu">
          <div className="themes-menu-inner">
            {themes.map((t) => (
              <Link key={t.id} href={`/collections/${t.slug}`} onClick={closeAll}>
                <span className="frame themes-menu-photo"><Image src={t.image_url} alt="" fill sizes="240px" className="cover" style={{ objectPosition: t.card_position }} /></span>
                <strong>{t.name}</strong>
              </Link>
            ))}
          </div>
        </div>
      )}
      {panel === "shop" && (
        <div id="nav-panel" className="themes-menu">
          <div className="shop-menu">
            {mains.map((m) => (
              <div key={m.id}>
                <Link href={`/shop/${m.slug}`} className="shop-menu-title" onClick={closeAll}>{m.name}</Link>
                {categories.filter((c) => c.parent_id === m.id).map((c) => <Link key={c.id} href={`/shop/${c.slug}`} onClick={closeAll}>{c.name}</Link>)}
              </div>
            ))}
          </div>
          <div className="themes-menu-all"><Link href="/collections" onClick={closeAll}>Explore all collections</Link></div>
        </div>
      )}
    </div>
  );
}
