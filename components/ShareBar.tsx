"use client";

import { useEffect, useState, type ReactNode } from "react";

const I = (d: ReactNode) => <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="currentColor">{d}</svg>;
const ICONS: Record<string, ReactNode> = {
  Facebook: I(<path d="M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 3.9v2.3H8v3h2.5V21h3z" />),
  Pinterest: I(<path d="M12 2a10 10 0 0 0-3.6 19.3c-.1-.8-.2-2 0-2.9l1.3-5.4s-.3-.7-.3-1.6c0-1.5.9-2.6 2-2.6.9 0 1.4.7 1.4 1.6 0 1-.6 2.4-.9 3.7-.3 1.1.6 2 1.7 2 2 0 3.5-2.1 3.5-5.2 0-2.7-2-4.6-4.8-4.6-3.3 0-5.2 2.5-5.2 5 0 1 .4 2.1.9 2.7.1.1.1.2.1.3l-.3 1.3c-.1.2-.2.3-.4.2-1.5-.7-2.4-2.8-2.4-4.5 0-3.7 2.7-7.1 7.7-7.1 4 0 7.2 2.9 7.2 6.7 0 4-2.5 7.2-6 7.2-1.2 0-2.3-.6-2.7-1.3l-.7 2.8c-.3 1-1 2.3-1.5 3A10 10 0 1 0 12 2z" />),
  WhatsApp: I(<path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1-.2-.1-1-.4-2-1.2-.7-.7-1.2-1.5-1.4-1.7-.1-.2 0-.4.1-.5l.4-.4.2-.4v-.4l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.7.3-.2.3-.9.9-.9 2.2s.9 2.5 1 2.7c.1.2 1.8 2.8 4.4 3.9 1.6.7 2.3.8 3.1.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.6-.3z" />),
  Email: I(<path d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm9 7.2L4.4 7H4v.3l8 5.6 8-5.6V7h-.4L12 12.2zM4 9.6V17h16V9.6l-8 5.6-8-5.6z" />),
  Link: I(<path d="M10.6 13.4a1 1 0 0 1 0-1.4l3.5-3.5a1 1 0 1 1 1.4 1.4L12 13.4a1 1 0 0 1-1.4 0zm-2.1 6.3a4.5 4.5 0 0 1-3.2-7.7l2.1-2.1a1 1 0 1 1 1.4 1.4l-2.1 2.1a2.5 2.5 0 0 0 3.5 3.5l2.1-2.1a1 1 0 1 1 1.4 1.4l-2.1 2.1a4.5 4.5 0 0 1-3.1 1.4zm7.7-6.4a1 1 0 0 1-.7-1.7l2.1-2.1a2.5 2.5 0 0 0-3.5-3.5l-2.1 2.1a1 1 0 1 1-1.4-1.4l2.1-2.1a4.5 4.5 0 0 1 6.3 6.3l-2.1 2.1a1 1 0 0 1-.7.3z" />),
  Share: I(<path d="M18 16a3 3 0 0 0-2.4 1.2l-6.7-3.4a3 3 0 0 0 0-1.6l6.7-3.4A3 3 0 1 0 15 7l-6.7 3.4a3 3 0 1 0 0 3.2L15 17a3 3 0 1 0 3-1z" />),
  Check: I(<path d="M9.5 16.2 5.3 12l-1.4 1.4 5.6 5.6L20.1 8.4 18.7 7z" />),
};

// Share an article or product to social media, by email, or by copying the link. On phones, the share icon opens the phone's own share menu.
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
    <div className="share-bar" role="group" aria-label="Share">
      <span className="share-label">Share</span>
      {native && <button type="button" className="share-icon" onClick={() => navigator.share({ title, text, url }).catch(() => null)} aria-label="Share" title="Share">{ICONS.Share}</button>}
      {links.map((l) => <a key={l.name} className="share-icon" href={l.href} target={l.name === "Email" ? undefined : "_blank"} rel="noopener noreferrer" aria-label={l.name === "Email" ? "Share by email" : `Share on ${l.name}`} title={l.name}>{ICONS[l.name]}</a>)}
      <button type="button" className="share-icon" onClick={copy} aria-label={copied ? "Link copied" : "Copy link"} title={copied ? "Link copied" : "Copy link"}>{copied ? ICONS.Check : ICONS.Link}</button>
      {copied && <span className="share-copied" role="status">Link copied</span>}
    </div>
  );
}
