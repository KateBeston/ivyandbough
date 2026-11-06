"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { CONSENT_EVENT, readConsent } from "@/lib/consent";
import { Honeypot } from "./Honeypot";
import { Turnstile, TURNSTILE_ON } from "./Turnstile";

type Turn = { role: "user" | "assistant"; content: string };
const TOPICS = ["Order", "Product", "Delivery", "Returns", "Website problem", "Other"];
const FORM = "[[SUPPORT_FORM]]";
const STARTERS = ["When do I need to order for Christmas?", "How much is delivery?", "What if something arrives damaged?"];

// Only this site's own pages and our email address become clickable.
function withLinks(text: string) {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(/\[([^\]]+)\]\((\/[a-z0-9/-]*|mailto:hello@ivyandbough\.com)\)/gi)) {
    parts.push(text.slice(last, m.index), m[2].startsWith("/") ? <Link key={m.index} href={m[2]}>{m[1]}</Link> : <a key={m.index} href={m[2]}>{m[1]}</a>);
    last = m.index + m[0].length;
  }
  parts.push(text.slice(last));
  return parts;
}

export function HelpChat() {
  const path = usePathname();
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState("");
  const [error, setError] = useState("");
  const [token, setToken] = useState("");
  const log = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = () => setReady(Boolean(readConsent()));
    check();
    window.addEventListener(CONSENT_EVENT, check);
    return () => window.removeEventListener(CONSENT_EVENT, check);
  }, []);
  useEffect(() => { log.current?.scrollTo({ top: log.current.scrollHeight }); }, [turns, busy]);

  if (!ready || path.startsWith("/preview") || path.startsWith("/sign")) return null;

  async function ask(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    const next: Turn[] = [...turns, { role: "user", content: question }];
    setTurns(next);
    setDraft("");
    setBusy(true);
    const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: next }) }).catch(() => null);
    const data = await res?.json().catch(() => null);
    const reply = String(data?.reply || `I can't answer right now, but I can pass this to the team. ${FORM}`);
    setTurns([...next, { role: "assistant", content: reply.replace(FORM, "").trim() }]);
    if (reply.includes(FORM)) setForm(true);
    setBusy(false);
  }

  async function request(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSending(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const res = await fetch("/api/support", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: f.get("name"), email: f.get("email"), topic: f.get("topic"), orderNumber: f.get("orderNumber"), message: f.get("message"), company: f.get("company"), page: window.location.pathname, token }) }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setSending(false);
    if (!res?.ok) return setError(data?.error ?? "That didn't go through. Please email hello@ivyandbough.com.");
    setForm(false);
    setSent(data?.reference || "received");
  }
  const submit = (e: FormEvent) => { e.preventDefault(); ask(draft); };

  if (!open) return <button type="button" className="help-open" onClick={() => setOpen(true)}>Need help?</button>;
  return (
    <section className="help-chat" aria-label="Help assistant">
      <header>
        <div><strong>Ivy &amp; Bough Support</strong><small>AI assistant</small></div>
        <button type="button" aria-label="Close help" onClick={() => setOpen(false)}>&times;</button>
      </header>
      <div className="help-log" ref={log} aria-live="polite">
        <p className="help-bot">Hello, I&apos;m the Ivy &amp; Bough Support assistant, and I&apos;m an AI. I can help with our products, delivery and returns. If I can&apos;t answer, I can pass your question to our team.</p>
        {!turns.length && <div className="help-starters">{STARTERS.map((s) => <button key={s} type="button" onClick={() => ask(s)}>{s}</button>)}</div>}
        {turns.map((t, n) => <p key={n} className={t.role === "user" ? "help-you" : "help-bot"}>{t.role === "user" ? t.content : withLinks(t.content)}</p>)}
        {busy && <p className="help-bot">One moment.</p>}
        {sent && <p className="help-bot">Thanks, your request {sent === "received" ? "" : `${sent} `}has been confirmed. We&apos;ve emailed you a confirmation, and someone will respond by email within the next 24 hours.</p>}
        {form ? (
          <form className="help-form" onSubmit={request}>
            <strong>Send a support request</strong>
            <Honeypot />
            <Turnstile onToken={setToken} />
            {error && <p role="alert" className="form-error">{error}</p>}
            <label>Your name<input name="name" required autoComplete="name" /></label>
            <label>Email<input name="email" type="email" required autoComplete="email" /></label>
            <label>What is it about?<select name="topic" defaultValue="Other">{TOPICS.map((t) => <option key={t}>{t}</option>)}</select></label>
            <label>Order number, if you have one<input name="orderNumber" autoComplete="off" /></label>
            <label>How can we help?<textarea name="message" required rows={4} maxLength={4000} /></label>
            <button className="solid" disabled={sending || (TURNSTILE_ON && !token)}>{sending ? "Sending" : "Send request"}</button>
            <button type="button" className="link-button" onClick={() => setForm(false)}>Back to chat</button>
          </form>
        ) : turns.length > 0 && !busy && !sent && <button type="button" className="link-button help-more" onClick={() => setForm(true)}>Didn&apos;t answer your question? Send a support request</button>}
      </div>
      <form className="help-ask" onSubmit={submit}>
        <input aria-label="Your question" value={draft} maxLength={800} onChange={(e) => setDraft(e.target.value)} placeholder="Type your question" autoComplete="off" />
        <button type="submit" className="solid" disabled={busy || !draft.trim()}>Send</button>
      </form>
      <p className="help-note">This is an AI assistant, so answers can be wrong. Please check anything important, and don&apos;t share card details in the chat.</p>
    </section>
  );
}
