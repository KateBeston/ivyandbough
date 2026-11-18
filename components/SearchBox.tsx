"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Hit = { name: string; href: string; image?: string; price?: string };
type Results = { collections: Hit[]; categories: Hit[]; products: Hit[] };

// Header search: suggestions appear as you type; Enter goes to the full results page.
export function SearchBox({ onNavigate }: { onNavigate?: () => void }) {
  const [q, setQ] = useState("");
  const [res, setRes] = useState<Results | null>(null);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (q.trim().length < 2) { setRes(null); return; }
    const stop = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q.trim())}`, { signal: stop.signal }).then((r) => r.json()).then((d: Results) => { setRes(d); setOpen(true); }).catch(() => {});
    }, 200);
    return () => { clearTimeout(t); stop.abort(); };
  }, [q]);
  useEffect(() => {
    const away = (e: PointerEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, []);
  const done = () => { setOpen(false); onNavigate?.(); };
  const any = res && (res.collections.length || res.categories.length || res.products.length);
  return (
    <form ref={box} action="/search" role="search" className="nav-search" onSubmit={() => setOpen(false)}>
      <input type="search" name="q" placeholder="Search" aria-label="Search the site" autoComplete="off" value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => res && setOpen(true)} onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }} />
      <button type="submit">Go</button>
      {open && res && (
        <div className="search-suggest" role="listbox" aria-label="Search suggestions">
          {!any && <p className="search-suggest-empty">No matches yet. Press Enter to search everything.</p>}
          {res.collections.map((h) => <Link key={h.href} href={h.href} onClick={done} className="ss-collection">{h.image && <img src={h.image} alt="" />}<span><small>Collection</small>{h.name}</span></Link>)}
          {res.categories.map((h) => <Link key={h.href} href={h.href} onClick={done} className="ss-category"><small>Shop</small>{h.name}</Link>)}
          {res.products.map((h) => <Link key={h.href} href={h.href} onClick={done} className="ss-product">{h.image ? <img src={h.image} alt="" /> : <span className="ss-blank" />}<span>{h.name}<em>{h.price}</em></span></Link>)}
          {any ? <Link href={`/search?q=${encodeURIComponent(q.trim())}`} onClick={done} className="ss-all">See all results</Link> : null}
        </div>
      )}
    </form>
  );
}
