"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { readConsent, saveConsent, type Consent } from "@/lib/consent";

const OPEN = "ib-cookie-settings";

export function CookieConsent() {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(!readConsent());
    const show = () => setOpen(true);
    window.addEventListener(OPEN, show);
    return () => window.removeEventListener(OPEN, show);
  }, []);

  if (!open || path.startsWith("/preview")) return null;
  const choose = (choice: Consent) => { saveConsent(choice); setOpen(false); };
  return (
    <section className="cookie-banner" aria-label="Cookie choices">
      <p>Essential cookies keep your basket and account working. Optional analytics and marketing cookies are only used if you accept. Read our <Link href="/cookies">Cookie Policy</Link>.</p>
      <div>
        <button type="button" onClick={() => choose("essential")}>Essential only</button>
        <button type="button" className="solid" onClick={() => choose("all")}>Accept all</button>
      </div>
    </section>
  );
}

export function CookieSettingsLink() {
  return <button type="button" className="footer-cookie" onClick={() => window.dispatchEvent(new Event(OPEN))}>Cookie settings</button>;
}
