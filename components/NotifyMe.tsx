"use client";

import { useState, type FormEvent } from "react";
import { Honeypot } from "./Honeypot";
import { Turnstile, TURNSTILE_ON } from "./Turnstile";

export function NotifyMe({ productId }: { productId: string }) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [token, setToken] = useState("");
  const [attempt, setAttempt] = useState(0);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending");
    const f = new FormData(e.currentTarget);
    const res = await fetch("/api/notify-me", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId, email: f.get("email"), marketing: f.get("marketing") === "on", company: f.get("company"), token }) }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setAttempt((n) => n + 1);
    if (res?.ok) setState("done");
    else { setError(data?.error ?? "That didn't go through. Please try again."); setState("error"); }
  }

  if (state === "done") return <p className="notify-done" role="status">Thank you. We&apos;ll email you once when it&apos;s available.</p>;
  return (
    <form className="notify-me" onSubmit={submit}>
      <p className="notify-lead">Coming soon. Leave your email and we&apos;ll let you know when it arrives.</p>
      <div className="notify-row">
        <label className="visually-hidden" htmlFor={`notify-${productId}`}>Email address</label>
        <input id={`notify-${productId}`} name="email" type="email" required maxLength={254} autoComplete="email" placeholder="Email address" />
        <button type="submit" className="solid" disabled={state === "sending" || (TURNSTILE_ON && !token)}>{state === "sending" ? "Sending" : "Notify me"}</button>
      </div>
      <label className="check-line notify-consent"><input type="checkbox" name="marketing" /><span>Also send me news and offers from Ivy &amp; Bough. You can unsubscribe at any time.</span></label>
      <Honeypot />
      <Turnstile onToken={setToken} resetKey={attempt} />
      {state === "error" && <p role="alert" className="form-error">{error}</p>}
    </form>
  );
}
