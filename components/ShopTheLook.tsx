"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const spots = [
  { name: "Mantel garland", left: "24%", top: "22%" },
  { name: "Pine cone bowl", left: "22%", top: "69%" },
  { name: "Fairy-lit tree", left: "84%", top: "40%" },
];

export function ShopTheLook({ productHref }: { productHref: string }) {
  const [on, setOn] = useState(0);
  return (
    <section className="look">
      <div className="look-photo">
        <Image src="/images/theme-rustic.jpg" alt="Warm living room with a garlanded fireplace and small tree" width={1800} height={1200} sizes="(max-width: 900px) 100vw, 60vw" />
        {spots.map((s, i) => (
          <button key={s.name} type="button" className="spot" aria-label={`Show ${s.name}`} aria-pressed={on === i} style={{ left: s.left, top: s.top }} onClick={() => setOn(i)}>{i + 1}</button>
        ))}
      </div>
      <div className="look-copy">
        <div className="eyebrow">Shop the look</div>
        <h2 className="heading">The Rustic Homestead room</h2>
        <div className="look-list">
          {spots.map((s, i) => (
            <Link key={s.name} href={productHref} className={on === i ? "on" : ""}><span>{i + 1}. {s.name}</span><span>[YOUR PRICE]</span></Link>
          ))}
        </div>
        <button type="button" className="solid">Add the look to basket</button>
      </div>
    </section>
  );
}
