"use client";

import Image from "next/image";
import { useState } from "react";
import type { Theme } from "@/lib/catalogue";
import { Nav } from "./Nav";

export function Hero({ themes }: { themes: Theme[] }) {
  const [active, setActive] = useState(themes[0]);
  return (
    <section className="hero">
      {themes.map((t) => (
        <Image key={t.id} src={t.image_url} alt={t.id === active.id ? t.image_alt : ""} fill priority={t.id === themes[0].id} sizes="100vw" quality={85} className="cover" style={{ objectPosition: t.hero_position, opacity: t.id === active.id ? 1 : 0, transition: "opacity .6s ease" }} />
      ))}
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(90deg, rgba(16,13,9,${active.hero_shade}) 0%, rgba(16,13,9,${active.hero_shade * 0.4}) 52%, rgba(16,13,9,0) 78%)` }} />
      <div className="hero-wash" />
      <Nav />
      <div className="hero-inner">
        <div style={{ maxWidth: 560 }}>
          <h1>Bring Christmas home, to keep for years</h1>
          <p>{active.line}</p>
          <a href="#edit" className="outline">Shop {active.name}</a>
        </div>
        <div className="theme-tabs" role="group" aria-label="Choose a theme">
          {themes.map((t) => (
            <button key={t.id} type="button" aria-pressed={t.id === active.id} onClick={() => setActive(t)}>{t.name}</button>
          ))}
        </div>
      </div>
    </section>
  );
}
