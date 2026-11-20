"use client";

import { useEffect, useRef, useState } from "react";

// Share button for event pages. Phones and tablets get their own share menu. Computers get a small menu of
// share links instead of the Windows or Mac share panel, so Facebook opens in the browser the visitor is using.
export function ShareButton({ title, icon }: { title: string; icon?: boolean }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => { if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close); document.addEventListener("keydown", close);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", close); };
  }, [open]);

  async function share() {
    const touch = window.matchMedia("(pointer: coarse)").matches;
    if (touch && navigator.share) { try { await navigator.share({ title, url: window.location.href }); } catch { /* closed */ } return; }
    setOpen((o) => !o);
  }
  async function copy() {
    try { await navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => { setCopied(false); setOpen(false); }, 1500); } catch { /* blocked */ }
  }
  const url = typeof window === "undefined" ? "" : window.location.href;
  const u = encodeURIComponent(url);
  const links = [
    { name: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { name: "Pinterest", href: `https://www.pinterest.com/pin/create/button/?url=${u}&description=${encodeURIComponent(title)}` },
    { name: "WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}` },
    { name: "Email", href: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}` },
  ];
  const popup = (e: React.MouseEvent<HTMLAnchorElement>, name: string) => {
    if (name === "Email" || name === "WhatsApp") return;
    e.preventDefault();
    window.open(e.currentTarget.href, "share", "width=620,height=640,noopener");
    setOpen(false);
  };
  return (
    <div className="share-pop" ref={box}>
      {icon
        ? <button type="button" className="wo-btn wf-ico" onClick={share} aria-expanded={open}><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4" /></svg><span>Share</span></button>
        : <button type="button" className="wo-btn" onClick={share} aria-expanded={open}>Share</button>}
      {open && (
        <div className="share-menu" role="menu">
          {links.map((l) => <a key={l.name} role="menuitem" href={l.href} target={l.name === "Email" ? undefined : "_blank"} rel="noopener noreferrer" onClick={(e) => popup(e, l.name)}>{l.name}</a>)}
          <button type="button" role="menuitem" onClick={copy}>{copied ? "Link copied" : "Copy link"}</button>
        </div>
      )}
    </div>
  );
}
