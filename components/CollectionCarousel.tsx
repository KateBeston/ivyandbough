"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type Theme = { id: string; slug: string; name: string; note: string | null; image_url: string; card_image_url?: string | null; card_position: string | null };

// Featured collections as a rotating trio: the current collection large in the middle, its neighbours either side.
// Turns every few seconds, pauses on hover or focus, and stays still for people who prefer less motion.
export function CollectionCarousel({ themes }: { themes: Theme[] }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const still = useRef(false);
  const n = themes.length;
  const go = useCallback((i: number) => setActive(((i % n) + n) % n), [n]);

  useEffect(() => { still.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches; }, []);
  useEffect(() => {
    if (paused || n < 2 || still.current) return;
    const t = setInterval(() => setActive((a) => (a - 1 + n) % n), 5000);
    return () => clearInterval(t);
  }, [paused, n]);

  if (!n) return null;
  const place = (i: number) => {
    let d = i - active;
    if (d > n / 2) d -= n;
    if (d < -n / 2) d += n;
    return d === 0 ? "centre" : d === -1 ? "left" : d === 1 ? "right" : d < 0 ? "off-left" : "off-right";
  };

  return (
    <div className="carousel" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <div className="carousel-stage" aria-live="polite">
        {themes.map((t, i) => {
          const pos = place(i);
          const side = pos === "left" || pos === "right";
          return (
            <Link
              key={t.id}
              href={`/collections/${t.slug}`}
              className={`carousel-card ${pos}`}
              aria-hidden={pos !== "centre"}
              tabIndex={pos === "centre" ? 0 : -1}
              onClick={(e) => { if (side) { e.preventDefault(); go(i); } }}
            >
              <div className="carousel-photo">
                <Image src={t.card_image_url || t.image_url} alt="" fill sizes="(max-width: 760px) 80vw, 600px" className="cover" style={{ objectPosition: t.card_position ?? "center" }} priority={pos === "centre"} />
                <span className="carousel-caption"><strong>{t.name}</strong>{t.note && <span>{t.note}</span>}</span>
              </div>
            </Link>
          );
        })}
      </div>
      <div className="carousel-controls">
        <button type="button" onClick={() => go(active - 1)} aria-label="Previous collection">‹</button>
        <div className="carousel-dots">
          {themes.map((t, i) => <button key={t.id} type="button" className={i === active ? "on" : ""} onClick={() => go(i)} aria-label={`Show ${t.name}`} aria-current={i === active} />)}
        </div>
        <button type="button" onClick={() => go(active + 1)} aria-label="Next collection">›</button>
      </div>
    </div>
  );
}
