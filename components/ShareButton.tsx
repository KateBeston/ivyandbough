"use client";

import { useState } from "react";

export function ShareButton({ title }: { title: string }) {
  const [done, setDone] = useState(false);
  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title, url });
      else { await navigator.clipboard.writeText(url); setDone(true); setTimeout(() => setDone(false), 2000); }
    } catch { /* closed */ }
  }
  return <button type="button" className="wo-btn" onClick={share}>{done ? "Link copied" : "Share"}</button>;
}
