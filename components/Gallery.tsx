"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { ProductImage } from "@/lib/catalogue";
import { Lightbox } from "./Lightbox";

export function Gallery({ images }: { images: ProductImage[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [zoom, setZoom] = useState<number | null>(null);
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
      <div className="ic-stage" onClick={() => { const photos = images.filter((x) => x.media_type !== "video"); const k = photos.indexOf(images[idx]); if (k >= 0) { setPaused(true); setZoom(k); } }} role="button" tabIndex={0} aria-label="Open photo to zoom" onKeyDown={(e) => { if (e.key === "Enter") { const photos = images.filter((x) => x.media_type !== "video"); const k = photos.indexOf(images[idx]); if (k >= 0) setZoom(k); } }}>
        {images.map((img, k) => img.media_type === "video"
          ? (k === idx ? <video key={img.url} src={img.url} className="cover ic-slide on ic-video" autoPlay muted loop playsInline controls aria-label={img.alt || "Product video"} onPlay={() => setPaused(true)} /> : null)
          : <Image key={img.url} src={img.url} alt={k === idx ? img.alt : ""} aria-hidden={k !== idx} fill priority={k === 0} sizes="(max-width: 900px) 100vw, 50vw" quality={85} className={`cover ic-slide${k === idx ? " on" : ""}${img.position === "contain" ? " fit" : ""}`} style={img.position === "contain" ? undefined : { objectPosition: img.position }} />)}
      </div>
      {zoom !== null && <Lightbox images={images.filter((x) => x.media_type !== "video")} start={zoom} onClose={() => { setZoom(null); setPaused(false); }} />}
      {images[idx]?.media_type !== "video" && <span className="ic-zoom" aria-hidden="true">⤢ Click to zoom</span>}
      {many && (
        <div className="ic-car">
          <button type="button" className="ic-cbtn" onClick={() => step(-1)} aria-label="Previous image">‹</button>
          <div className="ic-strip">
            {others.map((k) => (
              <button key={images[k].url} type="button" className="ic-thumb" onClick={() => setI(k)} aria-label={images[k].media_type === "video" ? "Play video" : `Show image ${k + 1}`}>
                {images[k].media_type === "video" ? <><video src={`${images[k].url}#t=0.1`} className="cover" muted playsInline preload="metadata" /><span className="ic-play" aria-hidden="true">▶</span></> : <Image src={images[k].url} alt="" fill sizes="60px" className="cover" />}
              </button>
            ))}
          </div>
          <button type="button" className="ic-cbtn" onClick={() => step(1)} aria-label="Next image">›</button>
        </div>
      )}
    </div>
  );
}
