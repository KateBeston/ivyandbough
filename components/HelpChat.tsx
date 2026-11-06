"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { CONSENT_EVENT, readConsent } from "@/lib/consent";

type Turn = { role: "user" | "assistant"; content: string };
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
    setTurns([...next, { role: "assistant", content: data?.reply || "I can't answer right now. Please use our [contact page](/contact)." }]);
    setBusy(false);
  }
  const submit = (e: FormEvent) => { e.preventDefault(); ask(draft); };

  if (!open) return <button type="button" className="help-open" onClick={() => setOpen(true)}>Need help?</button>;
  return (
    <section className="help-chat" aria-label="Help assistant">
      <header>
        <div><strong>Ivy &amp; Bough help</strong><small>AI assistant</small></div>
        <button type="button" aria-label="Close help" onClick={() => setOpen(false)}>&times;</button>
      </header>
      <div className="help-log" ref={log} aria-live="polite">
        <p className="help-bot">Hello, how can I help? I can answer questions about delivery, returns and our range. I can&apos;t see your order, but our team can.</p>
        {!turns.length && <div className="help-starters">{STARTERS.map((s) => <button key={s} type="button" onClick={() => ask(s)}>{s}</button>)}</div>}
        {turns.map((t, n) => <p key={n} className={t.role === "user" ? "help-you" : "help-bot"}>{t.role === "user" ? t.content : withLinks(t.content)}</p>)}
        {busy && <p className="help-bot">One moment.</p>}
      </div>
      <form onSubmit={submit}>
        <input aria-label="Your question" value={draft} maxLength={800} onChange={(e) => setDraft(e.target.value)} placeholder="Type your question" autoComplete="off" />
        <button type="submit" className="solid" disabled={busy || !draft.trim()}>Send</button>
      </form>
      <p className="help-note">Answers can be wrong, so please check anything important. Don&apos;t share card or personal details. <Link href="/contact">Contact the team</Link></p>
    </section>
  );
}
