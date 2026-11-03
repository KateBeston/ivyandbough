"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Category, Theme } from "@/lib/catalogue";

type Panel = "themes" | "shop" | null;

export function Nav({ themes, categories, solid = false, showLogo = true }: { themes: Theme[]; categories: Category[]; solid?: boolean; showLogo?: boolean }) {
  const [panel, setPanel] = useState<Panel>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

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
    setPanel(null);
    setMobileOpen(false);
  };
  const items = panel === "themes"
    ? themes.map((t) => ({ key: t.id, href: `/themes/${t.slug}`, name: t.name, src: t.image_url, pos: t.card_position }))
    : categories.map((c) => ({ key: c.id, href: `/shop/${c.slug}`, name: c.name, src: c.image_url, pos: c.image_position }));

  return (
    <div className={`site-nav ${solid ? "nav-solid" : "nav-light"}${showLogo ? "" : " no-logo"}`} onMouseLeave={() => setPanel(null)}>
      <header className="nav">
        <button type="button" className="menu-toggle" aria-expanded={mobileOpen} aria-controls="main-menu" onClick={() => setMobileOpen(!mobileOpen)}>Menu</button>
        {showLogo && <Link href="/" className="logo" aria-label="Ivy &amp; Bough home"><img src="/brand/stacked-ink.svg" alt="" width={120} height={70} /></Link>}
        <nav id="main-menu" aria-label="Main" className={`menu${mobileOpen ? " open" : ""}`}>
          <button type="button" aria-expanded={panel === "themes"} aria-controls="nav-panel" onClick={() => setPanel(panel === "themes" ? null : "themes")} onMouseEnter={() => setPanel("themes")}>Themes</button>
          <button type="button" aria-expanded={panel === "shop"} aria-controls="nav-panel" onClick={() => setPanel(panel === "shop" ? null : "shop")} onMouseEnter={() => setPanel("shop")}>Shop</button>
          <Link href="/about" onClick={closeAll} onMouseEnter={() => setPanel(null)}>About</Link>
          <Link href="/delivery" onClick={closeAll} onMouseEnter={() => setPanel(null)}>Delivery</Link>
          <Link href="/contact" onClick={closeAll} onMouseEnter={() => setPanel(null)}>Contact</Link>
        </nav>
        <div className="nav-tools">
          <a href="#search">Search</a>
          <a href="#basket">Basket (0)</a>
        </div>
      </header>
      {panel && (
        <div id="nav-panel" className="themes-menu">
          <div className="themes-menu-inner">
            {items.map((i) => (
              <Link key={i.key} href={i.href} onClick={closeAll}>
                <span className={`frame themes-menu-photo${panel === "shop" ? " short" : ""}`}><Image src={i.src} alt="" fill sizes="240px" className="cover" style={{ objectPosition: i.pos }} /></span>
                <strong>{i.name}</strong>
              </Link>
            ))}
          </div>
          {panel === "shop" && <div className="themes-menu-all"><Link href="/shop" onClick={closeAll}>Shop everything</Link></div>}
        </div>
      )}
    </div>
  );
}
