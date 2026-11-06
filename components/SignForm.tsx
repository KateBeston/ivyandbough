"use client";

import { useState, type FormEvent } from "react";

export function SignForm({ token, name, company }: { token: string; name: string; company: string }) {
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending");
    setError("");
    const f = new FormData(e.currentTarget);
    const res = await fetch("/api/sign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, name: f.get("name"), position: f.get("position"), company: f.get("company"), abn: f.get("abn"), consent: f.get("consent") === "on" }) }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (res?.ok) return setState("done");
    setState("idle");
    setError(data?.error ?? "That didn't go through. Please try again.");
  }

  if (state === "done") return <div role="status" className="sign-done"><h2>Thank you, that&apos;s signed</h2><p>We&apos;ve emailed a signed copy to you.</p></div>;
  return (
    <form className="account-form sign-form" onSubmit={submit}>
      <h2>Sign this document</h2>
      {error && <p role="alert" className="form-error">{error}</p>}
      <label>Your full name<input name="name" required defaultValue={name} autoComplete="name" /></label>
      <label>Your position<input name="position" required autoComplete="organization-title" /></label>
      <label>Company<input name="company" required defaultValue={company} autoComplete="organization" /></label>
      <label>ABN<input name="abn" autoComplete="off" /></label>
      <label className="check-line"><input type="checkbox" name="consent" required /><span>I have read this document, I have authority to sign it for this company, and I agree to sign electronically. Typing my name above is my signature.</span></label>
      <button className="solid" disabled={state === "sending"}>{state === "sending" ? "Signing" : "Sign document"}</button>
    </form>
  );
}
