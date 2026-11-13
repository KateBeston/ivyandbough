"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { RecentReview } from "@/lib/reviews";

const KEY = "ib-review-toast-off";
const FIRST_DELAY = 25000;
const SHOW_FOR = 9000;
const GAP = 30000;
const QUIET = /^\/(basket|account|order|review|subscribe|unsubscribe|sign|preview|privacy|terms|terms-of-sale|account-terms|cookies)(\/|$)/;

// Rotates through recent approved reviews in the corner. Shows nothing until real reviews exist,
// and stays away for the rest of the visit once closed.
export function ReviewToast() {
  const path = usePathname();
  const [reviews, setReviews] = useState<RecentReview[]>([]);
  const [index, setIndex] = useState(-1);

  useEffect(() => {
    try { if (sessionStorage.getItem(KEY)) return; } catch { /* show anyway */ }
    fetch("/api/reviews/recent").then((r) => r.json()).then((d) => setReviews(d?.reviews ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!reviews.length || QUIET.test(path)) { setIndex(-1); return; }
    let n = 0;
    let timer: ReturnType<typeof setTimeout>;
    const show = () => { setIndex(n % reviews.length); n += 1; timer = setTimeout(hide, SHOW_FOR); };
    const hide = () => { setIndex(-1); timer = setTimeout(show, GAP); };
    timer = setTimeout(show, FIRST_DELAY);
    return () => clearTimeout(timer);
  }, [reviews, path]);

  if (index < 0 || !reviews[index]) return null;
  const r = reviews[index];
  const close = () => { setReviews([]); try { sessionStorage.setItem(KEY, "1"); } catch { /* fine */ } };

  return (
    <aside className="review-toast" aria-label="Customer review" aria-live="polite">
      <button type="button" className="review-toast-close" aria-label="Close" onClick={close}>&times;</button>
      <Link href={`/products/${r.slug}#reviews`} className="review-toast-link">
        {r.image && <img src={r.image} alt="" />}
        <span className="review-toast-copy">
          <span className="review-toast-stars" aria-label={`${r.rating} out of 5 stars`}>{"★".repeat(r.rating)}<span>{"★".repeat(5 - r.rating)}</span></span>
          <span className="review-toast-body"><strong>{r.name}</strong> {r.body}</span>
          <span className="review-toast-product">{r.product}</span>
        </span>
      </Link>
    </aside>
  );
}
