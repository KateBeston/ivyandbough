"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

export function SignupForm() {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending");
    const form = e.currentTarget;
    const email = new FormData(form).get("email");
    const res = await fetch("/api/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) }).catch(() => null);
    if (res?.ok) {
      form.reset();
      setState("done");
    } else {
      setState("error");
    }
  }

  return (
    <form onSubmit={submit}>
      <label>Email address<input name="email" type="email" required autoComplete="email" /></label>
      <button type="submit" disabled={state === "sending"}>Join</button>
      {state === "done" && <div className="msg" role="status">Nearly there. Please check your email to confirm.</div>}
      {state === "error" && <div className="msg" role="alert">That didn&apos;t go through. Please try again.</div>}
      <small className="form-note">By joining, you agree to receive marketing emails from Ivy &amp; Bough. You can unsubscribe at any time. See our <Link href="/privacy">Privacy Policy</Link>.</small>
    </form>
  );
}
