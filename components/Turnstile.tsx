"use client";

import { useEffect, useRef } from "react";

const KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
export const TURNSTILE_ON = Boolean(KEY);

type Api = { render: (el: HTMLElement, options: Record<string, unknown>) => string; remove: (id: string) => void };
type Tagged = Window & { turnstile?: Api };
let script: Promise<void> | null = null;

function loadScript() {
  script ??= new Promise((resolve, reject) => {
    const tag = document.createElement("script");
    tag.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    tag.async = true;
    tag.onload = () => resolve();
    tag.onerror = () => { script = null; reject(new Error("Turnstile failed to load")); };
    document.head.appendChild(tag);
  });
  return script;
}

// Stays invisible unless Cloudflare needs the visitor to tick a box. Change resetKey for a fresh token.
export function Turnstile({ onToken, resetKey = 0 }: { onToken: (token: string) => void; resetKey?: number }) {
  const box = useRef<HTMLDivElement>(null);
  const callback = useRef(onToken);
  callback.current = onToken;

  useEffect(() => {
    if (!KEY) return;
    let id = "";
    let gone = false;
    loadScript().then(() => {
      const api = (window as unknown as Tagged).turnstile;
      if (gone || !api || !box.current) return;
      id = api.render(box.current, { sitekey: KEY, appearance: "interaction-only", theme: "light", callback: (t: string) => callback.current(t), "expired-callback": () => callback.current(""), "error-callback": () => callback.current("") });
    }).catch(() => null);
    return () => {
      gone = true;
      if (id) (window as unknown as Tagged).turnstile?.remove(id);
      callback.current("");
    };
  }, [resetKey]);

  return KEY ? <div ref={box} className="turnstile" /> : null;
}
