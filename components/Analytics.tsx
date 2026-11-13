"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { CONSENT_EVENT, readConsent } from "@/lib/consent";

// Google Analytics for Ivy & Bough only (not TGS), loaded straight from Google.
const ID = "G-1NFMWB4SQE";
// Ivy & Bough's own Tag Manager container, for future tags. Don't add a GA tag or the Meta pixel in it: both are loaded below.
const GTM = "GTM-N52CVFTX";
// Meta (Facebook and Instagram) pixel, for ad measurement. Same consent rule as Analytics.
const META_PIXEL = "3833433373475898";
type Fbq = ((...args: unknown[]) => void) & { callMethod?: (...a: unknown[]) => void; queue?: unknown[]; push?: unknown; loaded?: boolean; version?: string };
type Tagged = Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void; fbq?: Fbq; _fbq?: Fbq };

function loadMeta() {
  const w = window as unknown as Tagged;
  if (w.fbq) return;
  const n = function (...args: unknown[]) { if (n.callMethod) n.callMethod(...args); else n.queue!.push(args); } as Fbq;
  w.fbq = n; w._fbq = n; n.push = n; n.loaded = true; n.version = "2.0"; n.queue = [];
  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);
  n("init", META_PIXEL);
}

// Product pages carry their SKU in the structured data, which matches the catalogue feed's id.
function productSku() {
  for (const el of Array.from(document.querySelectorAll('script[type="application/ld+json"]'))) {
    try {
      const data = JSON.parse(el.textContent ?? "");
      for (const d of Array.isArray(data) ? data : [data]) if (d?.["@type"] === "Product" && d.sku) return { sku: String(d.sku), name: String(d.name ?? ""), price: Number(d.offers?.price ?? d.offers?.[0]?.price ?? 0) };
    } catch { /* not JSON */ }
  }
  return null;
}

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
  loadMeta();
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
    const check = () => {
      if (readConsent() !== "all") return;
      load();
      const fbq = (window as unknown as Tagged).fbq;
      fbq?.("track", "PageView");
      if (path.startsWith("/products/")) {
        // Wait a tick so the page's structured data is in place after client navigation.
        setTimeout(() => { const p = productSku(); if (p) fbq?.("track", "ViewContent", { content_ids: [p.sku], content_type: "product", content_name: p.name, value: p.price, currency: "AUD" }); }, 300);
      }
    };
    check();
    window.addEventListener(CONSENT_EVENT, check);
    return () => window.removeEventListener(CONSENT_EVENT, check);
  }, [path]);
  return null;
}
