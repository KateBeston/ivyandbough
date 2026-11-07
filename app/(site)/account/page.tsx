"use client";

import { trackingUrl } from "@/lib/tracking";
import Link from "next/link";
import { publishedVersionId } from "@/lib/legal";
import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { formatPrice } from "@/lib/catalogue";
import { account, authHeader } from "@/lib/account-client";
import { useBasket } from "@/components/BasketProvider";
import { Honeypot } from "@/components/Honeypot";
import { Turnstile, TURNSTILE_ON } from "@/components/Turnstile";
import { offerText } from "@/lib/pricing";
import { MyRequests } from "@/components/MyRequests";

type Item = { name: string; quantity: number; unit_price: number; shipping_status: string; carrier: string; tracking_number: string };
type Order = { id: string; order_number: string; status: string; placed_on: string; total: number; subtotal: number; shipping_total: number; gst_total: number; shipping_name: string; shipping_address: string; items: Item[] };
type Address = { id: string; label: string; name: string; line1: string; line2: string; suburb: string; state: string; postcode: string };
const cents = (n: number) => formatPrice(Math.round(Number(n) * 100));
const states = ["QLD", "NSW", "VIC", "TAS", "SA", "WA", "NT", "ACT"];

function AuthForm() {
  const [mode, setMode] = useState<"in" | "up" | "reset">(() => (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("mode") === "up" ? "up" : "in"));
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [offer, setOffer] = useState("");
  const [token, setToken] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    account.from("promotions").select("discount_type,discount_value,min_order").eq("trigger", "Account sign-up").eq("is_active", true).order("created_at", { ascending: false }).limit(1).maybeSingle().then(({ data }) => setOffer(data ? offerText(data) : ""));
  }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMsg("");
    const f = new FormData(e.currentTarget);
    if (f.get("company")) { setBusy(false); return; }
    const email = String(f.get("email"));
    const password = String(f.get("password") ?? "");
    const origin = window.location.origin;
    const captcha = token ? { captchaToken: token } : {};
    const res = mode === "in" ? await account.auth.signInWithPassword({ email, password, options: captcha })
      : mode === "up" ? await account.auth.signUp({ email, password, options: { ...captcha, data: { full_name: String(f.get("name")), terms_version: await publishedVersionId("ACCOUNT-TERMS"), marketing_opt_in: f.get("marketing") === "on" }, emailRedirectTo: `${origin}/account` } })
      : await account.auth.resetPasswordForEmail(email, { ...captcha, redirectTo: `${origin}/account/reset` });
    setBusy(false);
    setAttempt((n) => n + 1);
    if (res.error) return setError(mode === "in" ? "That email or password isn't right." : res.error.message);
    if (mode === "up") setMsg("If this email is new, check your inbox to confirm your account. If you already have an account, sign in instead.");
    if (mode === "reset") setMsg("If that email has an account, we've sent a reset link.");
  }

  return (
    <main className="shop-page account-narrow">
      <h1 className="heading">{mode === "in" ? "Sign in" : mode === "up" ? "Create an account" : "Reset your password"}</h1>
      {mode === "up" && offer && <p className="welcome-offer">Create an account for {offer}. We&apos;ll email your code once you confirm your address, along with an unsubscribe link.</p>}
      <form className="account-form" onSubmit={submit}>
        <Honeypot />
        <Turnstile onToken={setToken} resetKey={attempt} />
        {error && <p role="alert" className="form-error">{error}</p>}
        {msg && <p role="status">{msg}</p>}
        {mode === "up" && <label>Name<input name="name" required autoComplete="name" /></label>}
        <label>Email<input name="email" type="email" required autoComplete="email" /></label>
        {mode !== "reset" && <label>Password<input name="password" type="password" required minLength={8} autoComplete={mode === "in" ? "current-password" : "new-password"} /></label>}
        {mode === "up" && <label className="check-line"><input type="checkbox" name="marketing" /><span>Email me about new collections, offers and anything left in my basket. This is optional.</span></label>}
        {mode === "up" && <label className="check-line"><input type="checkbox" name="terms" required /><span>I agree to the <Link href="/account-terms">Account Terms</Link>, <Link href="/terms">Website Terms of Use</Link> and <Link href="/privacy">Privacy Policy</Link>.</span></label>}
        <button className="solid" disabled={busy || (TURNSTILE_ON && !token)}>{mode === "in" ? "Sign in" : mode === "up" ? "Create account" : "Send reset link"}</button>
      </form>
      <div className="account-links">
        {mode !== "in" && <button type="button" className="link-button" onClick={() => setMode("in")}>Sign in</button>}
        {mode !== "up" && <button type="button" className="link-button" onClick={() => setMode("up")}>Create an account</button>}
        {mode !== "reset" && <button type="button" className="link-button" onClick={() => setMode("reset")}>Forgot your password?</button>}
      </div>
    </main>
  );
}

function Orders() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  useEffect(() => {
    (async () => {
      await account.rpc("link_customer", { full_name: "" });
      const { data } = await account.rpc("my_orders");
      setOrders((data ?? []) as Order[]);
    })();
  }, []);
  if (!orders) return <p>Loading your orders.</p>;
  if (!orders.length) return <p>You haven&apos;t placed an order yet.</p>;
  return (
    <>
      {orders.map((o) => (
        <details key={o.id} className="order-card">
          <summary><strong>{o.order_number}</strong><span>{o.placed_on}</span><span>{o.status}</span><span>{cents(o.total)}</span></summary>
          {o.items.map((i, n) => (
            <div key={n} className="order-line">
              <div>{i.quantity} × {i.name}</div>
              <div>{i.shipping_status}{i.carrier ? ` with ${i.carrier}` : ""}{i.tracking_number ? <>, {trackingUrl(i.carrier, i.tracking_number) ? <a href={trackingUrl(i.carrier, i.tracking_number)!} target="_blank" rel="noopener noreferrer">track your parcel</a> : `tracking ${i.tracking_number}`}</> : ""}</div>
            </div>
          ))}
          <p className="muted">Delivered to {o.shipping_name}, {o.shipping_address}</p>
          <p className="muted">Delivery {cents(o.shipping_total)}. Total {cents(o.total)}, including {cents(o.gst_total)} GST.</p>
        </details>
      ))}
    </>
  );
}

function Details({ email }: { email: string }) {
  const [form, setForm] = useState({ name: "", phone: "" });
  const [msg, setMsg] = useState("");
  useEffect(() => {
    account.rpc("my_details").then(({ data }) => { if (data) setForm({ name: data.name ?? "", phone: data.phone ?? "" }); });
  }, []);
  async function save(e: FormEvent) {
    e.preventDefault();
    const { error } = await account.rpc("update_my_details", { full_name: form.name, phone_number: form.phone });
    setMsg(error ? "That didn't save. Please try again." : "Saved.");
  }
  return (
    <form className="account-form" onSubmit={save}>
      {msg && <p role="status">{msg}</p>}
      <label>Email<input value={email} disabled /></label>
      <label>Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" /></label>
      <label>Phone<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} autoComplete="tel" /></label>
      <button className="solid">Save</button>
    </form>
  );
}

function Addresses({ userId }: { userId: string }) {
  const blank = { label: "", name: "", line1: "", line2: "", suburb: "", state: "QLD", postcode: "" };
  const [rows, setRows] = useState<Address[]>([]);
  const [form, setForm] = useState(blank);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    const { data } = await account.from("customer_addresses").select("*").order("created_at");
    setRows((data ?? []) as Address[]);
  }, []);
  useEffect(() => { load(); }, [load]);
  async function add(e: FormEvent) {
    e.preventDefault();
    const { error: err } = await account.from("customer_addresses").insert({ ...form, auth_user_id: userId });
    if (err) return setError("That didn't save. Please try again.");
    setForm(blank);
    load();
  }
  async function remove(id: string) {
    await account.from("customer_addresses").delete().eq("id", id);
    load();
  }
  const input = (key: keyof typeof blank, label: string, required = false) => <label>{label}<input required={required} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></label>;
  return (
    <>
      {rows.map((a) => (
        <div key={a.id} className="order-line">
          <div><strong>{a.label || a.name}</strong><br />{[a.name, a.line1, a.line2, `${a.suburb} ${a.state} ${a.postcode}`].filter(Boolean).join(", ")}</div>
          <button type="button" className="link-button" onClick={() => remove(a.id)}>Remove</button>
        </div>
      ))}
      <form className="account-form" onSubmit={add}>
        {error && <p role="alert" className="form-error">{error}</p>}
        {input("label", "Label, such as Home")}
        {input("name", "Name", true)}
        {input("line1", "Address", true)}
        {input("line2", "Address line 2")}
        {input("suburb", "Suburb", true)}
        <label>State<select value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })}>{states.map((s) => <option key={s}>{s}</option>)}</select></label>
        {input("postcode", "Postcode", true)}
        <button className="solid">Add address</button>
      </form>
    </>
  );
}

function PaymentMethods() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function open() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/account/payment-methods", { method: "POST", headers: await authHeader() }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (data?.url) { window.location.href = data.url; return; }
    setBusy(false);
    setError(data?.error ?? "That didn't open. Please try again.");
  }
  return (
    <div className="account-payments">
      <p>Save a card at checkout for a faster order next time, then add, change or remove your cards here. Your card details are held securely by Stripe, never by Ivy &amp; Bough.</p>
      {error && <p role="alert" className="form-error">{error}</p>}
      <button type="button" className="solid" disabled={busy} onClick={open}>Manage payment methods</button>
    </div>
  );
}

export default function AccountPage() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [tab, setTab] = useState("Orders");
  const { welcome } = useBasket();

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t === "payment") setTab("Payment methods");
    if (t === "requests") setTab("Returns and disputes");
    // After signing in from the basket, go straight back to checkout.
    const next = new URLSearchParams(window.location.search).get("next") ?? "";
    const back = (s: Session | null) => { if (s && /^\/[a-z]/.test(next)) window.location.replace(next); };
    account.auth.getSession().then(({ data }) => { setSession(data.session); back(data.session); });
    const { data } = account.auth.onAuthStateChange((e, s) => { setSession(s); if (e === "SIGNED_IN") back(s); });
    return () => data.subscription.unsubscribe();
  }, []);

  if (session === undefined) return <main className="shop-page" />;
  if (!session) return <AuthForm />;
  return (
    <main className="shop-page">
      <div className="account-head">
        <h1 className="heading">Your account</h1>
        <button type="button" className="link-button" onClick={() => account.auth.signOut()}>Sign out</button>
      </div>
      {welcome && <div className="welcome-offer"><p>Your welcome offer: {welcome.offer}.</p><strong>{welcome.code}</strong><p className="muted">{welcome.terms}</p></div>}
      <div className="pill-row account-tabs" role="tablist">
        {["Orders", "Returns and disputes", "Details", "Addresses", "Payment methods"].map((t) => <button key={t} type="button" role="tab" aria-selected={t === tab} className={t === tab ? "on" : ""} onClick={() => setTab(t)}>{t}</button>)}
      </div>
      {tab === "Orders" && <Orders />}
      {tab === "Returns and disputes" && <MyRequests />}
      {tab === "Details" && <Details email={session.user.email ?? ""} />}
      {tab === "Addresses" && <Addresses userId={session.user.id} />}
      {tab === "Payment methods" && <PaymentMethods />}
    </main>
  );
}
