"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ProductImage } from "@/lib/catalogue";

// Full-screen photo viewer: scroll, pinch or use + and − to zoom, drag to look around,
// arrows or swipe to change photo, Escape to close.
const MIN = 1, MAX = 5;

export function Lightbox({ images, start, onClose }: { images: ProductImage[]; start: number; onClose: () => void }) {
  const [i, setI] = useState(start);
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const stage = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const last = useRef<{ x: number; y: number; dist: number } | null>(null);
  const n = images.length;
  const img = images[i];

  const reset = () => { setScale(1); setPos({ x: 0, y: 0 }); };
  const go = useCallback((d: number) => { setI((p) => (p + d + n) % n); setScale(1); setPos({ x: 0, y: 0 }); }, [n]);

  // Zoom towards a point on screen, so what's under the cursor stays put.
  const zoomAt = useCallback((next: number, cx?: number, cy?: number) => {
    const s = Math.min(MAX, Math.max(MIN, next));
    const r = stage.current?.getBoundingClientRect();
    setScale((old) => {
      if (s === 1) { setPos({ x: 0, y: 0 }); return 1; }
      if (r && cx !== undefined && cy !== undefined) {
        const px = cx - (r.left + r.width / 2), py = cy - (r.top + r.height / 2);
        setPos((p) => ({ x: px - ((px - p.x) * s) / old, y: py - ((py - p.y) * s) / old }));
      }
      return s;
    });
  }, []);

  useEffect(() => {
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "+" || e.key === "=") zoomAt(scale * 1.4);
      else if (e.key === "-") zoomAt(scale / 1.4);
    };
    window.addEventListener("keydown", key);
    return () => { document.body.style.overflow = before; window.removeEventListener("keydown", key); };
  }, [go, onClose, scale, zoomAt]);

  // The wheel listener is attached directly so it can stop the page scrolling.
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => { e.preventDefault(); zoomAt(scale * (e.deltaY < 0 ? 1.15 : 1 / 1.15), e.clientX, e.clientY); };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [scale, zoomAt]);

  const down = (e: React.PointerEvent) => { e.currentTarget.setPointerCapture(e.pointerId); pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY }); last.current = null; };
  const move = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];
    if (pts.length === 2) {
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      if (last.current?.dist) zoomAt(scale * (dist / last.current.dist), mid.x, mid.y);
      last.current = { ...mid, dist };
    } else if (pts.length === 1) {
      const p = pts[0];
      if (last.current && scale > 1) setPos((o) => ({ x: o.x + p.x - last.current!.x, y: o.y + p.y - last.current!.y }));
      last.current = { x: p.x, y: p.y, dist: 0 };
    }
  };
  const swipeStart = useRef<number | null>(null);
  const up = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (!pointers.current.size) last.current = null;
    if (swipeStart.current !== null && scale === 1 && Math.abs(e.clientX - swipeStart.current) > 60) go(e.clientX < swipeStart.current ? 1 : -1);
    swipeStart.current = null;
  };

  return (
    <div className="lb" role="dialog" aria-modal="true" aria-label="Photo viewer">
      <div className="lb-bar">
        <span className="lb-count">{n > 1 ? `${i + 1} of ${n}` : ""}</span>
        <span className="lb-tools">
          <button type="button" onClick={() => zoomAt(scale / 1.4)} aria-label="Zoom out" disabled={scale <= MIN}>−</button>
          <button type="button" onClick={reset} aria-label="Fit to screen" className="lb-fit">{Math.round(scale * 100)}%</button>
          <button type="button" onClick={() => zoomAt(scale * 1.4)} aria-label="Zoom in" disabled={scale >= MAX}>+</button>
          <button type="button" onClick={onClose} aria-label="Close" className="lb-close">×</button>
        </span>
      </div>
      <div ref={stage} className={`lb-stage${scale > 1 ? " zoomed" : ""}`}
        onPointerDown={(e) => { swipeStart.current = e.clientX; down(e); }} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        onDoubleClick={(e) => zoomAt(scale > 1 ? 1 : 2.5, e.clientX, e.clientY)}
        onClick={(e) => { if (e.target === e.currentTarget && scale === 1) onClose(); }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img.url} alt={img.alt} draggable={false} style={{ transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})` }} />
      </div>
      {n > 1 && <>
        <button type="button" className="lb-nav prev" onClick={() => go(-1)} aria-label="Previous photo">‹</button>
        <button type="button" className="lb-nav next" onClick={() => go(1)} aria-label="Next photo">›</button>
      </>}
      <p className="lb-hint">Scroll or pinch to zoom · drag to look around · double-click to zoom in or out</p>
    </div>
  );
}
