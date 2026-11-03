"use client";

import { useState, type FormEvent } from "react";

export function ContactForm() {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending");
    const form = e.currentTarget;
    const body = Object.fromEntries(new FormData(form));
    const res = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
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
      <label className="hp" aria-hidden="true">Company<input name="company" tabIndex={-1} autoComplete="off" /></label>
      <button type="submit" className="solid" disabled={state === "sending"}>Send message</button>
      {state === "done" && <p role="status">Thank you. Your message is on its way to us.</p>}
      {state === "error" && <p role="alert">That didn&apos;t go through. Please try again.</p>}
    </form>
  );
}
