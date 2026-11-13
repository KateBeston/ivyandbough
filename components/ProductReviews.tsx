import type { Review } from "@/lib/reviews";

export function Stars({ value, label }: { value: number; label?: string }) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  return (
    <span className="stars" role="img" aria-label={label ?? `${value.toFixed(1)} out of 5 stars`}>
      <span className="stars-base" aria-hidden="true">★★★★★</span>
      <span className="stars-fill" aria-hidden="true" style={{ width: `${pct}%` }}>★★★★★</span>
    </span>
  );
}

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-AU", { month: "long", year: "numeric" }) : "");

// Approved reviews from verified orders. Nothing shows until there's at least one.
export function ProductReviews({ reviews, average, count }: { reviews: Review[]; average: number; count: number }) {
  if (!count) return null;
  return (
    <section className="product-reviews" id="reviews" aria-labelledby="reviews-title">
      <div className="product-reviews-head">
        <h2 id="reviews-title" className="heading">Reviews</h2>
        <p><Stars value={average} /> <strong>{average.toFixed(1)}</strong> from {count} review{count === 1 ? "" : "s"}</p>
      </div>
      <ul className="product-reviews-list">
        {reviews.map((r) => (
          <li key={r.id}>
            <Stars value={r.rating} label={`${r.rating} out of 5 stars`} />
            {r.body && <p className="review-body">{r.body}</p>}
            {r.photo_url && <img src={r.photo_url} alt={`Photo from ${r.display_name || "a customer"}`} className="review-photo" loading="lazy" />}
            <p className="review-meta">{r.display_name || "A customer"} · Verified buyer · {when(r.approved_at ?? r.created_at)}</p>
            {r.reply && <p className="review-reply"><strong>Ivy &amp; Bough:</strong> {r.reply}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}
