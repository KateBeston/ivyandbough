"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { CONSENT_EVENT, readConsent } from "@/lib/consent";

// Google Analytics for Ivy & Bough only (not TGS), loaded straight from Google.
const ID = "G-1NFMWB4SQE";
// Ivy & Bough's own Tag Manager container, for future tags (e.g. Meta pixel). Don't add a GA tag in it: Analytics is loaded below.
const GTM = "GTM-N52CVFTX";
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
  w.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
  const gtm = document.createElement("script");
  gtm.id = "gtm";
  gtm.async = true;
  gtm.src = `https://www.googletagmanager.com/gtm.js?id=${GTM}`;
  document.head.appendChild(gtm);
}

// Kate's own devices: visiting any page with ?notrack=on turns Analytics off on that device (?notrack=off turns it back on).
const OPT_OUT = "ib_notrack";
function optedOut() {
  try {
    const flag = new URLSearchParams(window.location.search).get("notrack");
    if (flag === "on") { localStorage.setItem(OPT_OUT, "1"); alertOnce("Analytics is now off on this device. Your visits won't be counted."); }
    if (flag === "off") { localStorage.removeItem(OPT_OUT); alertOnce("Analytics is back on for this device."); }
    return localStorage.getItem(OPT_OUT) === "1";
  } catch { return false; }
}
function alertOnce(message: string) {
  const note = document.createElement("div");
  note.textContent = message;
  note.setAttribute("role", "status");
  note.style.cssText = "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:9999;background:#2F2C27;color:#FBF8F2;padding:12px 18px;font:14px/1.4 sans-serif;max-width:90vw;text-align:center";
  document.body.appendChild(note);
  setTimeout(() => note.remove(), 6000);
}

export function Analytics() {
  const path = usePathname();
  useEffect(() => {
    if (path.startsWith("/preview")) return;
    if (optedOut()) return;
    const check = () => { if (readConsent() === "all") load(); };
    check();
    window.addEventListener(CONSENT_EVENT, check);
    return () => window.removeEventListener(CONSENT_EVENT, check);
  }, [path]);
  return null;
}
