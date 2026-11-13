"use client";

import { useState, type FormEvent } from "react";
import { Honeypot } from "./Honeypot";

type Item = { id: string; name: string; image: string; reviewed: boolean };

export function ReviewForm({ orderId, token, product, defaultName }: { orderId: string; token: string; product: Item; defaultName: string }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">(product.reviewed ? "done" : "idle");
  const [error, setError] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!rating) { setError("Please choose a star rating."); setState("error"); return; }
    setState("sending");
    const data = new FormData(e.currentTarget);
    data.set("o", orderId); data.set("t", token); data.set("product_id", product.id); data.set("rating", String(rating));
    const res = await fetch("/api/reviews", { method: "POST", body: data }).catch(() => null);
    const json = await res?.json().catch(() => null);
    if (res?.ok && json?.ok) return setState("done");
    setError(json?.error || "That didn't go through. Please try again.");
    setState("error");
  }

  return (
    <section className="review-item">
      <div className="review-item-head">
        {product.image ? <img src={product.image} alt="" /> : <span className="review-item-blank" />}
        <h2>{product.name}</h2>
      </div>
      {state === "done" ? (
        <p className="review-thanks" role="status">Thank you for your review.</p>
      ) : (
        <form onSubmit={submit}>
          <Honeypot />
          <fieldset className="review-stars" onMouseLeave={() => setHover(0)}>
            <legend>Your rating</legend>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" aria-label={`${n} star${n > 1 ? "s" : ""}`} aria-pressed={rating === n} className={(hover || rating) >= n ? "on" : ""} onMouseEnter={() => setHover(n)} onClick={() => setRating(n)}>★</button>
            ))}
          </fieldset>
          <label>Your review <span className="optional">(optional)</span><textarea name="body" rows={4} maxLength={2000} placeholder="What did you love about it? How does it look in your home?" /></label>
          <label>Name shown with your review<input name="display_name" defaultValue={defaultName} maxLength={40} /></label>
          <label>Add a photo <span className="optional">(optional)</span><input name="photo" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" /></label>
          {state === "error" && <p role="alert" className="form-error">{error}</p>}
          <button type="submit" className="solid" disabled={state === "sending"}>{state === "sending" ? "Sending…" : "Send review"}</button>
        </form>
      )}
    </section>
  );
}
