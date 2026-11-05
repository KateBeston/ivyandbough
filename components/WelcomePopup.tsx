"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { account } from "@/lib/account-client";
import { CONSENT_EVENT, readConsent } from "@/lib/consent";
import { offerAmount, type Promotion } from "@/lib/pricing";
import { supabase } from "@/lib/supabase";
import { Honeypot } from "./Honeypot";
import { Turnstile, TURNSTILE_ON } from "./Turnstile";

const KEY = "ib-welcome-popup";
const DELAY = 10000;
const QUIET = /^\/(basket|account|order|subscribe|preview|privacy|terms|terms-of-sale|account-terms|cookies)(\/|$)/;
type Offer = Promotion & { valid_days: number; applies_to_sale: boolean };

function remember() {
  try { localStorage.setItem(KEY, new Date().toISOString()); } catch { /* it may show again on the next visit */ }
}

function seen() {
  try { return Boolean(localStorage.getItem(KEY)); } catch { return true; }
}

// Shows once, after the cookie choice, and never to someone already signed in.
export function WelcomePopup() {
  const path = usePathname();
  const box = useRef<HTMLDialogElement>(null);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (QUIET.test(path) || seen()) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const show = async () => {
      if (seen()) return;
      const { data: auth } = await account.auth.getSession();
      if (auth.session) return;
      const { data } = await supabase.from("promotions").select("discount_type,discount_value,min_order,valid_days,applies_to_sale").eq("trigger", "Newsletter sign-up").eq("is_active", true).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (data) { remember(); setOffer(data as Offer); }
    };
    const arm = () => { if (readConsent() && !timer) timer = setTimeout(show, DELAY); };
    arm();
    window.addEventListener(CONSENT_EVENT, arm);
    return () => { clearTimeout(timer); window.removeEventListener(CONSENT_EVENT, arm); };
  }, [path]);

  useEffect(() => {
    if (offer && box.current && !box.current.open) { box.current.showModal(); box.current.focus(); }
  }, [offer]);

  if (!offer) return null;
  const amount = offerAmount(offer);
  const min = Number(offer.min_order);
  const close = () => box.current?.close();

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending");
    const data = new FormData(e.currentTarget);
    const address = String(data.get("email"));
    const res = await fetch("/api/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: address, company: data.get("company"), token, source: "popup" }) }).catch(() => null);
    setAttempt((n) => n + 1);
    if (!res?.ok) return setState("error");
    setEmail(address);
    setState("done");
  }

  return (
    <dialog ref={box} tabIndex={-1} className="welcome-pop" aria-labelledby="welcome-pop-title" onClose={() => setOffer(null)} onClick={(e) => { if (e.target === box.current) close(); }}>
      <div className="welcome-pop-card">
        <div className="welcome-pop-image"><img src="/images/hero-traditional.jpg" alt="" /><img src="/brand/stacked-cream.svg" alt="" className="welcome-pop-logo" /></div>
        <div className="welcome-pop-body">
          <button type="button" className="welcome-pop-close" aria-label="Close" onClick={close}>&times;</button>
          {state === "done" ? (
            <div role="status">
              <p className="welcome-pop-eyebrow">One last step</p>
              <h2 id="welcome-pop-title" className="welcome-pop-small">Check your inbox</h2>
              <p>If this address is new to us, we&apos;ve sent a link to <strong>{email}</strong>. Confirm your address and your {amount} code will be ready to use.</p>
              <p className="welcome-pop-fine">Can&apos;t see it? Have a look in your spam folder.</p>
              <button type="button" className="solid" onClick={close}>Continue shopping</button>
            </div>
          ) : (
            <>
              <p className="welcome-pop-eyebrow">Welcome to Ivy &amp; Bough</p>
              <h2 id="welcome-pop-title">{amount}<span>your first order</span></h2>
              <p>Join our list for a first look at new collections, seasonal styling ideas and offers, starting with a little something from us.</p>
              <form onSubmit={submit}>
                <Honeypot />
                <Turnstile onToken={setToken} resetKey={attempt} />
                <label className="welcome-pop-email">Email address<input name="email" type="email" required autoComplete="email" /></label>
                <label className="check-line"><input type="checkbox" name="marketing" required /><span>Email me about new collections, offers and anything left in my basket. Unsubscribe at any time.</span></label>
                {state === "error" && <p role="alert" className="form-error">That didn&apos;t go through. Please try again.</p>}
                <button type="submit" className="solid" disabled={state === "sending" || (TURNSTILE_ON && !token)}>Claim my {amount}</button>
              </form>
              <button type="button" className="link-button welcome-pop-no" onClick={close}>No thanks</button>
              <p className="welcome-pop-fine">One code per person, for a first order{min ? ` of $${min} or more` : ""}. Expires {offer.valid_days} days after it&apos;s issued.{offer.applies_to_sale ? "" : " Not valid on sale or clearance items."} See our <Link href="/privacy" target="_blank">Privacy Policy</Link>.</p>
            </>
          )}
        </div>
      </div>
    </dialog>
  );
}
