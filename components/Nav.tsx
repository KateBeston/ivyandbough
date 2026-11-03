"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Theme } from "@/lib/catalogue";

const range = ["Trees", "Wreaths & Garlands", "Centrepieces", "Decorations", "Outdoor"];

export function Nav({ themes, solid = false, showLogo = true }: { themes: Theme[]; solid?: boolean; showLogo?: boolean }) {
  const [themesOpen, setThemesOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setThemesOpen(false);
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

  return (
    <div className={`site-nav ${solid ? "nav-solid" : "nav-light"}${showLogo ? "" : " no-logo"}`} onMouseLeave={() => setThemesOpen(false)}>
      <header className="nav">
        <button type="button" className="menu-toggle" aria-expanded={mobileOpen} aria-controls="main-menu" onClick={() => setMobileOpen(!mobileOpen)}>Menu</button>
        {showLogo && <Link href="/" className="logo" aria-label="Ivy &amp; Bough home"><img src="/brand/stacked-ink.svg" alt="" width={120} height={70} /></Link>}
        <nav id="main-menu" aria-label="Main" className={`menu${mobileOpen ? " open" : ""}`}>
          <button type="button" aria-expanded={themesOpen} aria-controls="themes-menu" onClick={() => setThemesOpen(!themesOpen)} onMouseEnter={() => setThemesOpen(true)}>Themes</button>
          {range.map((item) => <Link key={item} href="/#edit" onClick={() => setMobileOpen(false)}>{item}</Link>)}
        </nav>
        <div className="nav-tools">
          <a href="#search">Search</a>
          <a href="#basket">Basket (0)</a>
        </div>
      </header>
      {themesOpen && (
        <div id="themes-menu" className="themes-menu">
          <div className="themes-menu-inner">
            {themes.map((t) => (
              <Link key={t.id} href="/#themes" onClick={() => setThemesOpen(false)}>
                <span className="frame themes-menu-photo"><Image src={t.image_url} alt="" fill sizes="240px" className="cover" style={{ objectPosition: t.card_position }} /></span>
                <strong>{t.name}</strong>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
