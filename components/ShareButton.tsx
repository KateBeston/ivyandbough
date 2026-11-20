"use client";

import { useState } from "react";

export function ShareButton({ title, icon }: { title: string; icon?: boolean }) {
  const [done, setDone] = useState(false);
  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title, url });
      else { await navigator.clipboard.writeText(url); setDone(true); setTimeout(() => setDone(false), 2000); }
    } catch { /* closed */ }
  }
  const label = done ? "Copied" : "Share";
  if (icon) return <button type="button" className="wo-btn wf-ico" onClick={share}><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4" /></svg><span>{label}</span></button>;
  return <button type="button" className="wo-btn" onClick={share}>{done ? "Link copied" : "Share"}</button>;
}
