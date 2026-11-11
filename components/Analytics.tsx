"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { CONSENT_EVENT, readConsent } from "@/lib/consent";

// Ivy & Bough's own Tag Manager container (not TGS). Its Google tag sends to Analytics G-1NFMWB4SQE,
// and picks up the shopping events lib/track.ts queues with gtag().
const GTM = "GTM-N52CVFTX";
type Tagged = Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };

function load() {
  const w = window as unknown as Tagged;
  if (document.getElementById("gtm")) return;
  w.dataLayer = w.dataLayer ?? [];
  // Only loads after Accept all, so consent is granted from the first hit.
  w.gtag = function gtag() { w.dataLayer!.push(arguments); }; // eslint-disable-line prefer-rest-params
  w.gtag("consent", "default", { analytics_storage: "granted", ad_storage: "granted", ad_user_data: "granted", ad_personalization: "granted" });
  w.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
  const gtm = document.createElement("script");
  gtm.id = "gtm";
  gtm.async = true;
  gtm.src = `https://www.googletagmanager.com/gtm.js?id=${GTM}`;
  document.head.appendChild(gtm);
}

export function Analytics() {
  const path = usePathname();
  useEffect(() => {
    if (path.startsWith("/preview")) return;
    const check = () => { if (readConsent() === "all") load(); };
    check();
    window.addEventListener(CONSENT_EVENT, check);
    return () => window.removeEventListener(CONSENT_EVENT, check);
  }, [path]);
  return null;
}
