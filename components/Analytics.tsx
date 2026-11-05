"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { CONSENT_EVENT, readConsent } from "@/lib/consent";

const ID = process.env.NEXT_PUBLIC_GTM_ID;
type Tagged = Window & { dataLayer?: unknown[] };

function load() {
  const w = window as unknown as Tagged;
  if (!ID || !/^GTM-[A-Z0-9]+$/.test(ID) || document.getElementById("gtm")) return;
  w.dataLayer = w.dataLayer ?? [];
  // The container only loads after Accept all, so consent is granted from its first tag.
  function gtag(...args: unknown[]) { void args; w.dataLayer!.push(arguments); } // eslint-disable-line prefer-rest-params
  gtag("consent", "default", { analytics_storage: "granted", ad_storage: "granted", ad_user_data: "granted", ad_personalization: "granted" });
  w.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
  const script = document.createElement("script");
  script.id = "gtm";
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${ID}`;
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
