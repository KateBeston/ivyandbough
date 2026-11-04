"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { ProductImage } from "@/lib/catalogue";

export function Gallery({ images }: { images: ProductImage[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = images.length;
  const many = n > 1;

  useEffect(() => {
    if (!many || paused) return;
    const t = setInterval(() => setI((p) => (p + 1) % n), 12000);
    return () => clearInterval(t);
  }, [many, paused, n, i]);

  if (!n) return null;
  const idx = Math.min(i, n - 1);
  const others = many ? Array.from({ length: n - 1 }, (_, k) => (idx + 1 + k) % n) : [];
  const step = (d: number) => setI((idx + d + n) % n);

  return (
    <div className="ic" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="ic-stage">
        {images.map((img, k) => (
          <Image key={img.url} src={img.url} alt={k === idx ? img.alt : ""} aria-hidden={k !== idx} fill priority={k === 0} sizes="(max-width: 900px) 100vw, 50vw" quality={85} className={`cover ic-slide${k === idx ? " on" : ""}`} style={{ objectPosition: img.position }} />
        ))}
      </div>
      {many && (
        <div className="ic-car">
          <button type="button" className="ic-cbtn" onClick={() => step(-1)} aria-label="Previous image">‹</button>
          <div className="ic-strip">
            {others.map((k) => (
              <button key={images[k].url} type="button" className="ic-thumb" onClick={() => setI(k)} aria-label={`Show image ${k + 1}`}>
                <Image src={images[k].url} alt="" fill sizes="60px" className="cover" />
              </button>
            ))}
          </div>
          <button type="button" className="ic-cbtn" onClick={() => step(1)} aria-label="Next image">›</button>
        </div>
      )}
    </div>
  );
}
