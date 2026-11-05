"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { readConsent, saveConsent, type Consent } from "@/lib/consent";

const OPEN = "ib-cookie-settings";
const options: [string, string[]][] = [
  ["Essential only", ["Keeps your basket", "Keeps you signed in", "Secures checkout", "Remembers this choice"]],
  ["Accept all", ["Everything in Essential only", "Google Analytics, to improve the site", "Marketing, to show relevant offers"]],
];

export function CookieConsent() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [more, setMore] = useState(false);

  useEffect(() => {
    setOpen(!readConsent());
    const show = () => { setOpen(true); setMore(true); };
    window.addEventListener(OPEN, show);
    return () => window.removeEventListener(OPEN, show);
  }, []);

  if (!open || path.startsWith("/preview")) return null;
  const choose = (choice: Consent) => { saveConsent(choice); setOpen(false); };
  return (
    <section className="cookie-banner" aria-label="Cookie choices">
      <div className="cookie-row">
        <p>We use cookies to run this site. <button type="button" className="cookie-more-link" aria-expanded={more} onClick={() => setMore(!more)}>See what each option allows</button></p>
        <div className="cookie-actions">
          <button type="button" onClick={() => choose("essential")}>Essential only</button>
          <button type="button" className="solid" onClick={() => choose("all")}>Accept all</button>
        </div>
      </div>
      {more && (
        <div className="cookie-lists">
          {options.map(([title, items]) => <div key={title}><h2>{title}</h2><ul>{items.map((item) => <li key={item}>{item}</li>)}</ul></div>)}
          <p>You can change your choice at any time. Read our <Link href="/cookies">Cookie Policy</Link>.</p>
        </div>
      )}
    </section>
  );
}

export function CookieSettingsLink() {
  return <button type="button" className="footer-cookie" onClick={() => window.dispatchEvent(new Event(OPEN))}>Cookie settings</button>;
}
