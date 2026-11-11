"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { CONSENT_EVENT, readConsent } from "@/lib/consent";

// Google Analytics for Ivy & Bough only (not TGS). Loaded straight from Google, no Tag Manager.
const ID = "G-1NFMWB4SQE";
type Tagged = Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };

function load() {
  const w = window as unknown as Tagged;
  if (document.getElementById("ga")) return;
  w.dataLayer = w.dataLayer ?? [];
  // Only loads after Accept all, so consent is granted from the first hit.
  w.gtag = function gtag() { w.dataLayer!.push(arguments); }; // eslint-disable-line prefer-rest-params
  w.gtag("consent", "default", { analytics_storage: "granted", ad_storage: "granted", ad_user_data: "granted", ad_personalization: "granted" });
  w.gtag("js", new Date());
  w.gtag("config", ID);
  const script = document.createElement("script");
  script.id = "ga";
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${ID}`;
  document.head.appendChild(script);
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
