"use client";

import { useState, type FormEvent } from "react";
import { Honeypot } from "./Honeypot";
import { Turnstile, TURNSTILE_ON } from "./Turnstile";

export function ContactForm() {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [token, setToken] = useState("");
  const [attempt, setAttempt] = useState(0);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending");
    const form = e.currentTarget;
    const body = Object.fromEntries(new FormData(form));
    const res = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, token }) }).catch(() => null);
    setAttempt((n) => n + 1);
    if (res?.ok) {
      form.reset();
      setState("done");
    } else {
      setState("error");
    }
  }

  return (
    <form className="contact-form" onSubmit={submit}>
      <label>Name<input name="name" required maxLength={120} autoComplete="name" /></label>
      <label>Email address<input name="email" type="email" required maxLength={254} autoComplete="email" /></label>
      <label>Message<textarea name="message" required maxLength={4000} rows={7} /></label>
      <Honeypot />
      <Turnstile onToken={setToken} resetKey={attempt} />
      <button type="submit" className="solid" disabled={state === "sending" || (TURNSTILE_ON && !token)}>Send message</button>
      {state === "done" && <p role="status">Thank you. Your message is on its way to us.</p>}
      {state === "error" && <p role="alert">That didn&apos;t go through. Please try again.</p>}
    </form>
  );
}
