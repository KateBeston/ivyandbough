"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { Category, Theme } from "@/lib/catalogue";
import { Countdown } from "./Countdown";
import { Nav } from "./Nav";

export function Hero({ themes, categories }: { themes: Theme[]; categories: Category[] }) {
  const [active, setActive] = useState(themes[0]);
  return (
    <>
      <div className="window-bar"><Countdown /></div>
      <Nav themes={themes} categories={categories} solid />
      <section className="window">
        <div className="window-photos">
          <div className="frame window-main">
            {themes.map((t) => (
              <Image key={t.id} src={t.image_url} alt={t.id === active.id ? t.image_alt : ""} fill priority={t.id === themes[0].id} sizes="(max-width: 760px) 100vw, 66vw" quality={85} className="cover" style={{ objectPosition: t.hero_position, opacity: t.id === active.id ? 1 : 0, transition: "opacity .6s ease" }} />
            ))}
          </div>
          <div className="frame window-side"><Image src="/images/home-door.jpg" alt="Silver wreath on a black front door" fill sizes="(max-width: 760px) 50vw, 32vw" className="cover" /></div>
          <div className="frame window-side"><Image src="/images/home-tree.jpg" alt="Softly lit Christmas tree by a fireplace" fill sizes="(max-width: 760px) 50vw, 32vw" className="cover" /></div>
        </div>
        <div className="window-copy">
          <img src="/brand/wreath-ink.svg" alt="" className="window-wreath" width={170} height={170} />
          <div>
            <h1>Bring Christmas home</h1>
            <p>{active.line}</p>
            <Link href={`/collections/${active.slug}`} className="solid">Shop {active.name}</Link>
          </div>
        </div>
        <div className="theme-tabs" role="group" aria-label="Choose a collection">
          {themes.map((t) => (
            <button key={t.id} type="button" aria-pressed={t.id === active.id} onClick={() => setActive(t)}>{t.name}</button>
          ))}
        </div>
      </section>
    </>
  );
}
