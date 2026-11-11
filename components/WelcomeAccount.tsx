"use client";

import Link from "next/link";
import { Honeypot } from "./Honeypot";
import { useState, type FormEvent } from "react";
import { account } from "@/lib/account-client";
import { Turnstile, TURNSTILE_ON } from "./Turnstile";

export function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(code).catch(() => null);
    setCopied(true);
  };
  return <button type="button" className="link-button" onClick={copy}>{copied ? "Copied" : "Copy code"}</button>;
}

// Optional. The code is theirs whether or not they set a password.
export function WelcomeAccount({ email, setup }: { email: string; setup: string }) {
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState("");
  const [token, setToken] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending");
    setError("");
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password"));
    const res = await fetch("/api/subscribe/account", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ e: email, s: setup, password, terms: true, company: fd.get("company") }) }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (!res?.ok) { setState("idle"); return setError(data?.error ?? "That didn't go through. Please try again."); }
    await account.auth.signInWithPassword({ email, password, options: token ? { captchaToken: token } : {} });
    setState("done");
  }

  if (state === "done") return <p role="status" className="welcome-account-done">Your account is ready. <Link href="/account">Go to your account</Link></p>;
  return (
    <form className="account-form welcome-account" onSubmit={submit}>
      <h2>Set a password to create your account and track your orders</h2>
      <p className="muted">This is optional. Your code works either way.</p>
      <Turnstile onToken={setToken} />
      <Honeypot />
      {error && <p role="alert" className="form-error">{error}</p>}
      <label>Password<input name="password" type="password" required minLength={8} autoComplete="new-password" /></label>
      <label className="check-line"><input type="checkbox" name="terms" required /><span>I agree to the <Link href="/account-terms">Account Terms</Link>, <Link href="/terms">Website Terms of Use</Link> and <Link href="/privacy">Privacy Policy</Link>.</span></label>
      <button className="solid" disabled={state === "sending" || (TURNSTILE_ON && !token)}>Create my account</button>
    </form>
  );
}
