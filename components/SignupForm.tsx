"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Honeypot } from "./Honeypot";
import { Turnstile, TURNSTILE_ON } from "./Turnstile";

export function SignupForm({ offer = "" }: { offer?: string }) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [token, setToken] = useState("");
  const [attempt, setAttempt] = useState(0);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending");
    const form = e.currentTarget;
    const data = new FormData(form);
    const res = await fetch("/api/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: data.get("email"), company: data.get("company"), token }) }).catch(() => null);
    setAttempt((n) => n + 1);
    if (res?.ok) {
      form.reset();
      setState("done");
    } else {
      setState("error");
    }
  }

  return (
    <form onSubmit={submit}>
      {offer && <p className="form-offer">Join today for {offer}.</p>}
      <label>Email address<input name="email" type="email" required autoComplete="email" /></label>
      <Honeypot />
      <Turnstile onToken={setToken} resetKey={attempt} />
      <button type="submit" disabled={state === "sending" || (TURNSTILE_ON && !token)}>Join</button>
      {state === "done" && <div className="msg" role="status">Nearly there. Please check your email to confirm.</div>}
      {state === "error" && <div className="msg" role="alert">That didn&apos;t go through. Please try again.</div>}
      <small className="form-note">By joining, you agree to receive marketing emails from Ivy &amp; Bough. You can unsubscribe at any time. See our <Link href="/privacy">Privacy Policy</Link>.</small>
    </form>
  );
}
