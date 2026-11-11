"use client";

import { useEffect, useState } from "react";

// Share an article to social media, by email, or by copying the link. On phones, "Share" opens the phone's own share menu.
export function ShareBar({ url, title, text, image }: { url: string; title: string; text: string; image?: string }) {
  const [copied, setCopied] = useState(false);
  const [native, setNative] = useState(false);
  useEffect(() => { setNative(typeof navigator !== "undefined" && typeof navigator.share === "function"); }, []);
  const u = encodeURIComponent(url);
  const links = [
    { name: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { name: "Pinterest", href: `https://www.pinterest.com/pin/create/button/?url=${u}&description=${encodeURIComponent(title)}${image ? `&media=${encodeURIComponent(image)}` : ""}` },
    { name: "WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}` },
    { name: "Email", href: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${text}\n\n${url}`)}` },
  ];
  async function copy() {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard blocked */ }
  }
  return (
    <div className="share-bar" aria-label="Share this story">
      <span className="share-label">Share</span>
      {native && <button type="button" onClick={() => navigator.share({ title, text, url }).catch(() => null)}>Share…</button>}
      {links.map((l) => <a key={l.name} href={l.href} target={l.name === "Email" ? undefined : "_blank"} rel="noopener noreferrer">{l.name}</a>)}
      <button type="button" onClick={copy}>{copied ? "Link copied" : "Copy link"}</button>
    </div>
  );
}
