"use client";

import Image from "next/image";
import { useState } from "react";
import type { ProductImage } from "@/lib/catalogue";

export function Gallery({ images }: { images: ProductImage[] }) {
  const [i, setI] = useState(0);
  const main = images[i];
  if (!main) return null;
  return (
    <div className="gallery">
      <div className="frame gallery-main">
        <Image src={main.url} alt={main.alt} fill priority sizes="(max-width: 900px) 100vw, 50vw" quality={85} className="cover" style={{ objectPosition: main.position }} />
      </div>
      {images.length > 1 && (
        <div className="thumbs">
          {images.map((img, n) => (
            <button key={img.url} type="button" aria-label={img.alt} aria-pressed={n === i} onClick={() => setI(n)}>
              <Image src={img.url} alt="" fill sizes="20vw" className="cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
