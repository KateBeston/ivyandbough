"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { authHeader } from "@/lib/account-client";
import { CHANGE_OF_MIND, CONTACT_EMAIL, CONTACT_PHONE, DISPUTE_CATEGORIES, KINDS, MAX_PHOTOS, REFUND_REASONS, RESPONSE_HOURS, type EligibleOrder, type Kind } from "@/lib/requests";
import { PhotoPicker } from "./PhotoPicker";
import { Turnstile, TURNSTILE_ON } from "./Turnstile";

type Step = "kind" | "category" | "order" | "items" | "details" | "done";

function Help() {
  return (
    <p className="request-help">
      If you have any further concerns, feel free to {CONTACT_PHONE ? <>call us on <a href={`tel:${CONTACT_PHONE.replace(/\s/g, "")}`}>{CONTACT_PHONE}</a> or </> : ""}send us an email at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
    </p>
  );
}

export function RequestFlow({ signedIn, startKind, onClose, onSubmitted }: { signedIn: boolean; startKind?: Kind; onClose?: () => void; onSubmitted?: (reference: string) => void }) {
  const [kind, setKind] = useState<Kind | null>(startKind ?? null);
  const [category, setCategory] = useState("");
  const [orders, setOrders] = useState<EligibleOrder[] | null>(null);
  const [orderId, setOrderId] = useState("");
  const [itemIds, setItemIds] = useState<string[]>([]);
  const [issues, setIssues] = useState<string[]>([]);
  const [confirmUnused, setConfirmUnused] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [comment, setComment] = useState("");
  const [guest, setGuest] = useState({ name: "", email: "", phone: "", orderNumber: "", itemNumbers: "" });
  const [token, setToken] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const [step, setStep] = useState<Step>(startKind ? "category" : "kind");

  const needs = kind === "Refund" ? "items" : DISPUTE_CATEGORIES.find((c) => c.id === category)?.needs ?? "none";
  const options = kind === "Refund" ? REFUND_REASONS[category] ?? [] : DISPUTE_CATEGORIES.find((c) => c.id === category)?.issues ?? [];
  const steps = useMemo<Step[]>(() => [
    ...(startKind ? [] : ["kind" as Step]), "category",
    ...(signedIn && needs !== "none" ? ["order" as Step] : []),
    ...(signedIn && needs === "items" ? ["items" as Step] : []),
    "details",
  ], [startKind, signedIn, needs]);
  const at = steps.indexOf(step);
  const order = orders?.find((o) => o.id === orderId);
  const photosRequired = kind === "Refund";

  // Eligibility depends on the reason, so reload the orders whenever it changes.
  useEffect(() => {
    if (!signedIn || !category || needs === "none") return;
    setOrders(null);
    (async () => {
      const res = await fetch(`/api/requests/items?reason=${encodeURIComponent(kind === "Refund" ? category : "")}`, { headers: await authHeader() }).catch(() => null);
      const data = await res?.json().catch(() => null);
      setOrders(data?.orders ?? []);
    })();
  }, [signedIn, category, kind, needs]);

  const go = (s: Step) => { setError(""); setStep(s); };
  const next = () => go(steps[at + 1]);
  const back = () => (at > 0 ? go(steps[at - 1]) : onClose?.());
  const toggle = (list: string[], set: (v: string[]) => void, v: string) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  async function submit() {
    setError("");
    if (!issues.length) return setError("Please tick at least one issue.");
    if (kind === "Refund" && category === CHANGE_OF_MIND && !confirmUnused) return setError("Please confirm the item is unused and in its original packaging.");
    if (photosRequired && !photos.length) return setError("Please add at least one photo.");
    if (!signedIn && (!guest.name.trim() || !guest.email.trim())) return setError("Please add your name and email address.");
    if (!signedIn && needs !== "none" && !guest.orderNumber.trim()) return setError("Please add your order number.");
    setBusy(true);
    const form = new FormData();
    form.set("data", JSON.stringify({ kind, category, issues, comment, orderId, itemIds, token, ...guest }));
    photos.forEach((p) => form.append("photos", p));
    const res = await fetch("/api/requests", { method: "POST", headers: signedIn ? await authHeader() : {}, body: form }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setBusy(false);
    setAttempt((n) => n + 1);
    if (!res?.ok || !data?.reference) return setError(data?.error ?? "That didn't go through. Please try again.");
    setReference(data.reference);
    setStep("done");
    onSubmitted?.(data.reference);
  }

  if (step === "done") {
    return (
      <div className="request-flow request-done" role="status">
        <h2 className="heading">{kind === "Refund" ? "Your request has been submitted" : "Thank you for letting us know"}</h2>
        {kind === "Refund"
          ? <p>We will review this, investigate and contact you within {RESPONSE_HOURS} hours with an update.</p>
          : <p>We care about our service and want to put this right. We will respond within {RESPONSE_HOURS} hours.</p>}
        <p>Your reference is <strong>{reference}</strong>. We&apos;ve emailed you a copy{signedIn ? ", and you can see it any time under Returns and disputes in your account" : ""}.</p>
        {onClose && <button type="button" className="solid" onClick={onClose}>Close</button>}
      </div>
    );
  }

  return (
    <div className="request-flow">
      <p className="request-progress">Step {at + 1} of {steps.length}</p>

      {step === "kind" && (
        <>
          <h2 className="heading">What would you like to do?</h2>
          <div className="request-choices">
            {KINDS.map((k) => (
              <button key={k.id} type="button" className={`request-choice${kind === k.id ? " on" : ""}`} onClick={() => { setKind(k.id); setCategory(""); setIssues([]); setStep("category"); }}>
                <strong>{k.title}</strong><span>{k.text}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {step === "category" && (
        <>
          <h2 className="heading">{kind === "Refund" ? "Why would you like to return it?" : "What is it about?"}</h2>
          <div className="request-choices compact">
            {(kind === "Refund" ? Object.keys(REFUND_REASONS) : DISPUTE_CATEGORIES.map((c) => c.id)).map((c) => (
              <button key={c} type="button" className={`request-choice${category === c ? " on" : ""}`} onClick={() => { setCategory(c); setIssues([]); setItemIds([]); setOrderId(""); const n = kind === "Refund" ? "items" : DISPUTE_CATEGORIES.find((d) => d.id === c)?.needs; go(signedIn && n !== "none" ? "order" : "details"); }}>
                <strong>{c}</strong>
              </button>
            ))}
          </div>
          {kind === "Refund" && <p className="muted">Faulty, damaged or incorrect items are always covered under the Australian Consumer Law, whenever you let us know.</p>}
        </>
      )}

      {step === "order" && (
        <>
          <h2 className="heading">Which order is it?</h2>
          {!orders ? <p>Loading your orders.</p> : !orders.length ? <><p>We couldn&apos;t find any orders on your account.</p><Help /></> : (
            <div className="request-choices compact">
              {orders.map((o) => (
                <button key={o.id} type="button" className={`request-choice${orderId === o.id ? " on" : ""}`} onClick={() => { setOrderId(o.id); setItemIds([]); go(steps[steps.indexOf("order") + 1]); }}>
                  <strong>{o.order_number}</strong><span>Placed {o.placed_on} · {o.items.length} {o.items.length === 1 ? "item" : "items"}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {step === "items" && order && (
        <>
          <h2 className="heading">Which items?</h2>
          <p className="muted">Select one or more items from order {order.order_number}.</p>
          <div className="request-items">
            {order.items.map((i) => (
              <label key={i.order_item_id} className={`request-item${i.eligible ? "" : " blocked"}`}>
                <input type="checkbox" disabled={!i.eligible} checked={itemIds.includes(i.order_item_id)} onChange={() => toggle(itemIds, setItemIds, i.order_item_id)} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {i.image ? <img src={i.image} alt="" /> : <span className="request-item-blank" />}
                <span><strong>{i.name}</strong><small>Quantity {i.quantity}{i.sku ? ` · Item ${i.sku}` : ""}</small>{i.note && <small className={i.eligible ? "" : "request-blocked"}>{i.eligible ? i.note : `This item is not eligible for a refund. ${i.note}`}</small>}</span>
              </label>
            ))}
          </div>
          {order.items.some((i) => !i.eligible) && <Help />}
        </>
      )}

      {step === "details" && (
        <>
          <h2 className="heading">Tell us more</h2>
          {!signedIn && (
            <div className="request-guest">
              <p className="muted">Have an account? <Link href="/account?tab=requests">Sign in</Link> to choose items straight from your orders.</p>
              <label>Name<input value={guest.name} onChange={(e) => setGuest({ ...guest, name: e.target.value })} autoComplete="name" required maxLength={120} /></label>
              <label>Email<input type="email" value={guest.email} onChange={(e) => setGuest({ ...guest, email: e.target.value })} autoComplete="email" required maxLength={254} /></label>
              <label>Phone (optional)<input type="tel" value={guest.phone} onChange={(e) => setGuest({ ...guest, phone: e.target.value })} autoComplete="tel" maxLength={30} /></label>
              {needs !== "none" && <label>Order number<input value={guest.orderNumber} onChange={(e) => setGuest({ ...guest, orderNumber: e.target.value })} placeholder="For example IB-1001" required maxLength={30} /></label>}
              {needs === "items" && <label>Item names or numbers (optional)<input value={guest.itemNumbers} onChange={(e) => setGuest({ ...guest, itemNumbers: e.target.value })} placeholder="As shown on your receipt" maxLength={300} /></label>}
            </div>
          )}
          {signedIn && order && itemIds.length > 0 && <p className="muted">{order.items.filter((i) => itemIds.includes(i.order_item_id)).map((i) => i.name).join(", ")}</p>}
          <fieldset className="request-issues">
            <legend>{category}: what&apos;s the issue? Tick all that apply.</legend>
            {options.map((o) => <label key={o} className="check-line"><input type="checkbox" checked={issues.includes(o)} onChange={() => toggle(issues, setIssues, o)} /><span>{o}</span></label>)}
          </fieldset>
          {kind === "Refund" && category === CHANGE_OF_MIND && (
            <label className="check-line"><input type="checkbox" checked={confirmUnused} onChange={(e) => setConfirmUnused(e.target.checked)} /><span>The item is unused and in its original packaging.</span></label>
          )}
          <PhotoPicker photos={photos} setPhotos={setPhotos} max={MAX_PHOTOS} required={photosRequired} />
          <label className="request-comment">Other comments<textarea rows={5} maxLength={3000} value={comment} onChange={(e) => setComment(e.target.value)} /></label>
          {!signedIn && <Turnstile onToken={setToken} resetKey={attempt} />}
        </>
      )}

      {error && <p role="alert" className="form-error">{error}</p>}
      <div className="request-nav">
        {(at > 0 || onClose) && <button type="button" className="link-button" onClick={back}>{at > 0 ? "Back" : "Cancel"}</button>}
        {step === "items" && <button type="button" className="solid" disabled={!itemIds.length} onClick={next}>Continue</button>}
        {step === "details" && <button type="button" className="solid" disabled={busy || (!signedIn && TURNSTILE_ON && !token)} onClick={submit}>{busy ? "Sending" : "Submit"}</button>}
      </div>
    </div>
  );
}
