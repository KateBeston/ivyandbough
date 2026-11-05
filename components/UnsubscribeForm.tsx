"use client";

import { useState, type FormEvent } from "react";
import { Honeypot } from "./Honeypot";
import { Turnstile, TURNSTILE_ON } from "./Turnstile";

export function UnsubscribeForm() {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [token, setToken] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending");
    const data = new FormData(e.currentTarget);
    const res = await fetch("/api/unsubscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: data.get("email"), company: data.get("company"), token }) }).catch(() => null);
    setState(res?.ok ? "done" : "error");
  }

  if (state === "done") return <p role="status">If this address is on our list, we&apos;ve sent a link to confirm. It may take a few minutes to arrive.</p>;
  return (
    <form className="account-form" onSubmit={submit}>
      <p>Enter your email and we&apos;ll send a link to confirm. This stops marketing emails only. You&apos;ll still receive emails about your orders.</p>
      <Honeypot />
      <Turnstile onToken={setToken} />
      {state === "error" && <p role="alert" className="form-error">That didn&apos;t go through. Please try again.</p>}
      <label>Email<input name="email" type="email" required autoComplete="email" /></label>
      <button className="solid" disabled={state === "sending" || (TURNSTILE_ON && !token)}>Send confirmation link</button>
    </form>
  );
}
