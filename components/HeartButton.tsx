"use client";

import { useWishlist } from "./WishlistProvider";

export function HeartButton({ productId, name, className = "" }: { productId: string; name: string; className?: string }) {
  const w = useWishlist();
  if (!w) return null;
  const on = w.has(productId);
  return (
    <button type="button" className={`heart${on ? " on" : ""} ${className}`} aria-pressed={on} aria-label={on ? `Remove ${name} from saved items` : `Save ${name}`}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); w.toggle(productId); }}>
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-7.5-10.1A4.4 4.4 0 0 1 12 7.6a4.4 4.4 0 0 1 7.5 2.8c0 5.5-7.5 10.1-7.5 10.1z" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
    </button>
  );
}
