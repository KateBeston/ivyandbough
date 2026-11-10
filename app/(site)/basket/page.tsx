"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { AddressLookup, type PickedAddress } from "@/components/AddressLookup";
import { CheckoutAccount } from "@/components/CheckoutAccount";
import { useBasket } from "@/components/BasketProvider";
import { Honeypot } from "@/components/Honeypot";
import { PaymentMarks } from "@/components/PaymentMarks";
import { Price } from "@/components/Price";
import { Turnstile, TURNSTILE_ON } from "@/components/Turnstile";
import { formatPrice } from "@/lib/catalogue";

const STATES = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"];
const blank = { name: "", phone: "", line1: "", line2: "", city: "", state: "", postcode: "", smsUpdates: false, marketing: false, authorityToLeave: false, instructions: "" };
const mobileDigits = (value: string) => value.replace(/\D/g, "").replace(/^61/, "").replace(/^0/, "");
// Shows the number as it's typed in groups of three ("412 345 678"); it's sent as +61412345678 so texts and MMS reach it.
const formatMobile = (value: string) => mobileDigits(value).slice(0, 9).replace(/^(\d{3})(\d{1,3})?(\d{1,3})?$/, (_, a, b, c) => [a, b, c].filter(Boolean).join(" "));
// Couriers can't deliver to these, and some items ship by courier.
const PO_BOX = /\b(p\.?\s*o\.?\s*box|post\s*office\s*box|gpo\s*box|locked\s*bag|private\s*bag|parcel\s*locker|parcel\s*collect|community\s*mail\s*bag|cmb\s*\d)/i;
const Req = () => <span className="req" aria-hidden="true">*</span>;
// What's been typed is kept for this browser tab, so leaving to sign in or look at a product doesn't lose it.
// It's cleared when the tab closes or the order is placed. Card details are never here; they go straight to Stripe.
const DRAFT_KEY = "ib-checkout-details";
const readDraft = () => { try { return JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? "null") as Partial<typeof blank> | null; } catch { return null; } };
type Quote = { deliveryCents: number; free: boolean; zone: string };
type Promo = { code: string; discountCents: number; label: string };

export default function BasketPage() {
  const { lines, subtotal, setQuantity, remove, checkout, sessionId, welcome, paying, payFail } = useBasket();
  const [details, setDetails] = useState(blank);
  const [restored, setRestored] = useState(false);
  useEffect(() => { const d = readDraft(); if (d) setDetails((cur) => ({ ...cur, ...Object.fromEntries(Object.entries(d).filter(([k, v]) => v !== "" && v !== undefined && !(cur as Record<string, unknown>)[k])) })); setRestored(true); }, []);
  useEffect(() => { if (restored) { try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(details)); } catch { /* still works without it */ } } }, [details, restored]);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [code, setCode] = useState("");
  const [token, setToken] = useState("");
  const [attempt, setAttempt] = useState(0);
  const trap = useRef<HTMLDivElement>(null);
  const [promo, setPromo] = useState<Promo | null>(null);
  const [promoError, setPromoError] = useState("");
  const offerUsed = useRef(false);
  const validMobile = /^4\d{8}$/.test(mobileDigits(details.phone));
  const set = (patch: Partial<typeof blank>) => setDetails((d) => ({ ...d, ...patch }));
  const pick = (a: PickedAddress) => set({ ...a, state: STATES.includes(a.state) ? a.state : "" });
  const basketKey = useMemo(() => lines.map((l) => `${l.id}:${l.quantity}`).join(","), [lines]);

  useEffect(() => {
    setQuote(null);
    setQuoteError("");
    if (!/^\d{4}$/.test(details.postcode) || !lines.length) return;
    const stop = new AbortController();
    fetch("/api/delivery/quote", { method: "POST", signal: stop.signal, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ postcode: details.postcode, items: lines.map((l) => ({ id: l.id, quantity: l.quantity })) }) })
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (res.ok) setQuote(body);
        else setQuoteError(body?.error ?? "Delivery can't be calculated right now.");
      })
      .catch((e) => { if (e.name !== "AbortError") setQuoteError("Delivery can't be calculated right now."); });
    return () => stop.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [details.postcode, basketKey]);

  const applyCode = useCallback(async (value: string) => {
    setPromoError("");
    const res = await fetch("/api/promo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: value, sessionId: sessionId(), items: lines.map((l) => ({ id: l.id, quantity: l.quantity })) }) }).catch(() => null);
    const body = await res?.json().catch(() => null);
    if (res?.ok && body?.code) setPromo(body);
    else { setPromo(null); setPromoError(body?.error ?? "That code couldn't be applied."); }
  }, [lines, sessionId]);

  // The discount is worked out again whenever the basket changes.
  useEffect(() => {
    if (!lines.length) return;
    const active = promo?.code ?? (offerUsed.current ? "" : welcome?.code ?? "");
    if (!active) return;
    offerUsed.current = true;
    setCode(active);
    applyCode(active);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basketKey, welcome]);

  function submitCode(e: FormEvent) {
    e.preventDefault();
    if (code.trim()) applyCode(code);
  }

  function removeCode() {
    setPromo(null);
    setPromoError("");
    setCode("");
  }

  const discount = promo?.discountCents ?? 0;
  const payable = subtotal - discount + (quote?.deliveryCents ?? 0);
  const poBox = PO_BOX.test(`${details.line1} ${details.line2}`);
  const ready = quote && details.name.trim() && validMobile && details.line1.trim() && !poBox && details.city.trim() && details.state;
  const findAddress = () => { const el = document.querySelector<HTMLInputElement>(".address-lookup input") ?? document.querySelector<HTMLInputElement>('input[autocomplete="address-line1"]'); el?.scrollIntoView({ behavior: "smooth", block: "center" }); el?.focus({ preventScroll: true }); };

  // The payment window closed (or didn't load): the Checkout button works again.
  useEffect(() => { if (!paying) setBusy(false); }, [paying]);
  useEffect(() => { if (payFail) setError(payFail); }, [payFail]);

  async function pay() {
    setBusy(true);
    setError("");
    const message = await checkout({ ...details, phone: `+61${mobileDigits(details.phone)}` }, promo?.code, { token, company: trap.current?.querySelector("input")?.value ?? "", terms: agreed });
    setAttempt((n) => n + 1);
    if (message) {
      setError(message);
      setBusy(false);
    }
  }

  return (
    <main className="shop-page">
      <h1 className="heading">Your basket</h1>
      {!lines.length ? (
        <p style={{ marginTop: 16 }}>Your basket is empty. <Link href="/shop">Continue shopping</Link></p>
      ) : (
        <div className="basket-layout">
          <div>
            {lines.map((l) => (
              <div key={l.id} className="basket-line">
                <div className="frame">{l.image && <Image src={l.image} alt="" fill sizes="110px" className="cover" />}</div>
                <div>
                  <Link href={`/products/${l.slug}`} className="basket-name">{l.name.split(" – ")[0]}</Link>{l.name.includes(" – ") && <small className="basket-version">{l.name.split(" – ").slice(1).join(" – ")}</small>}
                  {l.sku && <div className="muted">Item no. {l.sku}</div>}
                  <div>{l.sale_label && <span className="product-offer-label">{l.sale_label}</span>}<div><Price cents={l.price_cents} wasCents={l.was_cents} /></div></div>
                  <button type="button" className="link-button" onClick={() => remove(l.id)}>Remove</button>
                </div>
                <label className="qty">Quantity<input type="number" min={1} max={20} value={l.quantity} onChange={(e) => setQuantity(l.id, Number(e.target.value))} /></label>
              </div>
            ))}
            <section className="delivery-details" aria-labelledby="delivery-details">
              <h2 id="delivery-details">Delivery details</h2>
              <CheckoutAccount onFill={(d) => set({ ...d, ...(d.phone ? { phone: formatMobile(d.phone) } : {}), ...(d.state !== undefined ? { state: STATES.includes(d.state) ? d.state : "" } : {}) })} />
              <AddressLookup onPick={pick} />
              <p className="req-note"><Req /> Required</p>
              <div className="delivery-grid">
                <label className="wide"><span>Full name <Req /></span><input autoComplete="name" required value={details.name} onChange={(e) => set({ name: e.target.value })} /></label>
                <label className="wide"><span>Mobile <Req /></span><span className="mobile-field"><span aria-hidden="true">+61</span><input type="tel" autoComplete="tel-national" inputMode="tel" required placeholder="412 345 678" aria-label="Mobile number, Australia plus 61" value={details.phone} onChange={(e) => set({ phone: formatMobile(e.target.value) })} /></span>
                  {details.phone && !validMobile && <span className="field-note">Enter an Australian mobile number, such as 412 345 678.</span>}
                </label>
                <label className="check-line wide"><input type="checkbox" checked={details.smsUpdates} onChange={(e) => set({ smsUpdates: e.target.checked })} /><span>Text me updates about my order by SMS and MMS, such as when it&apos;s on its way.</span></label>
                <label className="wide"><span>Address <Req /></span><input autoComplete="address-line1" required value={details.line1} onChange={(e) => set({ line1: e.target.value })} />
                  {poBox && <span className="field-note" role="alert">We can&apos;t deliver to PO Boxes, Locked Bags or Parcel Lockers. Please use a street address.</span>}
                </label>
                <label className="wide">Apartment, unit or building (optional)<input autoComplete="address-line2" value={details.line2} onChange={(e) => set({ line2: e.target.value })} /></label>
                <label className="wide"><span>Suburb <Req /></span><input autoComplete="address-level2" required value={details.city} onChange={(e) => set({ city: e.target.value })} /></label>
                <label><span>State <Req /></span><select autoComplete="address-level1" required value={details.state} onChange={(e) => set({ state: e.target.value })}><option value="">Choose</option>{STATES.map((s) => <option key={s}>{s}</option>)}</select></label>
                <label><span>Postcode <Req /></span><input inputMode="numeric" maxLength={4} autoComplete="postal-code" required value={details.postcode} onChange={(e) => set({ postcode: e.target.value.replace(/\D/g, "") })} /></label>
              </div>
              <div className="muted delivery-note">
                <p>We deliver to street addresses only. We can&apos;t deliver to PO Boxes, Locked Bags or Parcel Lockers.</p>
                <p><strong>Please check your address carefully.</strong> Once your order has been dispatched we can&apos;t change it, and any redelivery charge is yours to pay.</p>
                <p>Dispatch and delivery times are estimates and can be longer in the weeks before Christmas or for regional areas. Some items ship separately from our suppliers, and large items need a street address. <Link href="/delivery">Delivery information</Link></p>
              </div>
              <div className="delivery-consents">
                <label className="check-line"><input type="checkbox" checked={details.authorityToLeave} onChange={(e) => set({ authorityToLeave: e.target.checked })} /><span>Leave my parcel in a safe place if no one is home. Once it&apos;s left as asked, it counts as delivered.</span></label>
              </div>
              <div className="delivery-grid"><label className="wide">Delivery instructions (optional)<input maxLength={200} placeholder="For example, leave at the side gate" value={details.instructions} onChange={(e) => set({ instructions: e.target.value })} /></label></div>
              <div className="delivery-consents">
                <label className="check-line"><input type="checkbox" checked={details.marketing} onChange={(e) => set({ marketing: e.target.checked })} /><span>I&apos;d like to receive news, offers and basket reminders from Ivy &amp; Bough by email, SMS and MMS. You can opt out at any time.</span></label>
              </div>
            </section>
          </div>
          <aside className="basket-summary">
            <div><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
            {promo && <div><span>Discount <button type="button" className="link-button" onClick={removeCode}>Remove</button></span><span>-{formatPrice(discount)}</span></div>}
            <div><span>{quote ? `Delivery to ${details.postcode}` : "Delivery"}</span><span>{quote ? (quote.deliveryCents ? formatPrice(quote.deliveryCents) : "Free") : <button type="button" className="link-button" onClick={findAddress}>Add your delivery address</button>}</span></div>
            <div className="total"><span>Total</span><span>{formatPrice(payable)}</span></div>
            <p className="muted">{quote ? `Total includes ${formatPrice(Math.round(payable / 11))} GST.` : "Prices include GST."}</p>
            {quoteError && <p role="alert">{quoteError}</p>}
            {!promo && (
              <form className="promo-form" onSubmit={submitCode}>
                <input aria-label="Promotion code" placeholder="Promotion code" value={code} onChange={(e) => setCode(e.target.value)} />
                <button type="submit">Apply</button>
              </form>
            )}
            {promoError && <p role="alert">{promoError}</p>}
            <label className="check-line checkout-terms"><input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} required /><span>I agree to the <Link href="/terms-of-sale" target="_blank">Terms of Sale</Link> and have read the <Link href="/privacy" target="_blank">Privacy Policy</Link>.</span></label>
            <button type="button" className="solid" disabled={(busy || !ready || !agreed) || (TURNSTILE_ON && !token)} onClick={pay}>Checkout</button>
            <div ref={trap}><Honeypot /></div>
            <Turnstile onToken={setToken} resetKey={attempt} />
            <PaymentMarks />
            {!ready && <p className="muted">Add your delivery details to continue.</p>}
            {ready && !agreed && <p className="muted">Tick the box above to agree to the Terms of Sale and continue.</p>}
            {error && <p role="alert">{error}</p>}
          </aside>
        </div>
      )}
    </main>
  );
}
