"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { Category, Theme } from "@/lib/catalogue";
import { Nav } from "./Nav";

export function Hero({ themes, categories, offers }: { themes: Theme[]; categories: Category[]; offers: string[] }) {
  const [active, setActive] = useState(themes[0]);
  // Other images load when someone reaches for their tab, not all at once.
  const [wanted, setWanted] = useState([themes[0].id]);
  const want = (id: string) => setWanted((w) => (w.includes(id) ? w : [...w, id]));
  return (
    <section className="hero">
      {themes.filter((t) => wanted.includes(t.id)).map((t) => (
        <Image key={t.id} src={t.image_url} alt={t.id === active.id ? t.image_alt : ""} fill priority={t.id === themes[0].id} sizes="100vw" quality={85} className="cover" style={{ objectPosition: t.hero_position, opacity: t.id === active.id ? 1 : 0, transition: "opacity .6s ease" }} />
      ))}
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(90deg, rgba(16,13,9,${active.hero_shade}) 0%, rgba(16,13,9,${active.hero_shade * 0.4}) 52%, rgba(16,13,9,0) 78%)` }} />
      <div className="hero-wash" />
      <Nav themes={themes} categories={categories} offers={offers} showLogo={false} />
      <div className="hero-inner">
        <div style={{ maxWidth: 560 }}>
          <img src="/brand/wreath-cream.svg" alt="Ivy &amp; Bough" className="hero-logo" width={300} height={300} />
          <h1>Bring Christmas home</h1>
          <p>{active.line}</p>
          <Link href={`/collections/${active.slug}`} className="outline">Shop {active.name}</Link>
        </div>
        <div className="theme-tabs" role="group" aria-label="Choose a collection">
          {themes.map((t) => (
            <button key={t.id} type="button" aria-pressed={t.id === active.id} onPointerEnter={() => want(t.id)} onFocus={() => want(t.id)} onClick={() => { want(t.id); setActive(t); }}>{t.name}</button>
          ))}
        </div>
      </div>
    </section>
  );
}
