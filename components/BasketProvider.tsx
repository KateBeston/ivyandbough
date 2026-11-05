"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { account, authHeader } from "@/lib/account-client";

export type DeliveryDetails = { name: string; phone: string; line1: string; line2: string; city: string; state: string; postcode: string; smsUpdates: boolean; marketing: boolean };
export type Line = { id: string; sku?: string; slug: string; name: string; price_cents: number; was_cents?: number | null; sale_label?: string; image: string; quantity: number };
export type Welcome = { code: string; offer: string; terms: string };
type Basket = { lines: Line[]; count: number; subtotal: number; add: (line: Line) => void; setQuantity: (id: string, quantity: number) => void; remove: (id: string) => void; clear: () => void; sessionId: () => string; welcome: Welcome | null; checkout: (delivery: DeliveryDetails, promoCode?: string, guard?: { token: string; company: string }) => Promise<string | null> };

const BasketContext = createContext<Basket | null>(null);
export const useBasket = () => useContext(BasketContext)!;

const read = (key: string) => { try { return localStorage.getItem(key); } catch { return null; } };
const write = (key: string, value: string) => { try { localStorage.setItem(key, value); } catch { /* the basket still works for this visit */ } };
const clamp = (n: number) => Math.min(20, Math.max(1, Math.round(n) || 1));

type SavedRow = { quantity: number; products: { id: string; slug: string; name: string; price_cents: number | null; product_images: { url: string; sort_order: number }[] } | null };

function merge(current: Line[], extra: Line[]) {
  const out = [...current];
  for (const line of extra) if (!out.some((l) => l.id === line.id)) out.push(line);
  return out;
}

export function BasketProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<Line[]>([]);
  const [ready, setReady] = useState(false);
  const session = useRef("");
  const [welcome, setWelcome] = useState<Welcome | null>(null);
  const asked = useRef(false);
  const idKey = useMemo(() => lines.map((l) => l.id).sort().join(","), [lines]);

  useEffect(() => {
    try { setLines(JSON.parse(read("ib-basket") ?? "[]") as Line[]); } catch { setLines([]); }
    session.current = read("ib-session") ?? crypto.randomUUID();
    write("ib-session", session.current);
    setReady(true);
    const { data } = account.auth.onAuthStateChange((event, auth) => {
      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && auth && !asked.current) {
        asked.current = true;
        setTimeout(async () => {
          const res = await fetch("/api/welcome", { method: "POST", headers: { Authorization: `Bearer ${auth.access_token}` } }).catch(() => null);
          const body = await res?.json().catch(() => null);
          if (body?.code) setWelcome(body);
        }, 0);
      }
      if (event !== "SIGNED_IN" || !auth) return;
      setTimeout(async () => {
        await account.rpc("link_customer", { full_name: String(auth.user.user_metadata?.full_name ?? "") });
        const { data: saved } = await account.from("cart_items").select("quantity,products(id,slug,name,price_cents,product_images(url,sort_order))").eq("status", "In cart");
        const restored = ((saved ?? []) as unknown as SavedRow[]).flatMap((r) => (r.products && r.products.price_cents !== null ? [{ id: r.products.id, slug: r.products.slug, name: r.products.name, price_cents: r.products.price_cents, image: [...r.products.product_images].sort((a, b) => a.sort_order - b.sort_order)[0]?.url ?? "", quantity: r.quantity }] : []));
        if (restored.length) setLines((l) => merge(l, restored));
      }, 0);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!ready) return;
    write("ib-basket", JSON.stringify(lines));
    const t = setTimeout(async () => {
      await fetch("/api/cart", { method: "POST", headers: { "Content-Type": "application/json", ...(await authHeader()) }, body: JSON.stringify({ sessionId: session.current, lines: lines.map((l) => ({ id: l.id, quantity: l.quantity })) }) }).catch(() => null);
    }, 1200);
    return () => clearTimeout(t);
  }, [lines, ready]);

  useEffect(() => {
    if (!ready || !idKey) return;
    fetch("/api/basket/prices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: idKey.split(",") }) })
      .then((res) => res.json())
      .then((body: { prices: { id: string; cents: number | null; wasCents: number | null; label: string }[] }) => setLines((current) => current.map((l) => {
        const live = body.prices.find((p) => p.id === l.id);
        return live?.cents ? { ...l, price_cents: live.cents, was_cents: live.wasCents, sale_label: live.label } : l;
      })))
      .catch(() => null);
  }, [idKey, ready]);

  const add = useCallback((line: Line) => setLines((l) => (l.some((x) => x.id === line.id) ? l.map((x) => (x.id === line.id ? { ...x, quantity: clamp(x.quantity + line.quantity) } : x)) : [...l, { ...line, quantity: clamp(line.quantity) }])), []);
  const setQuantity = useCallback((id: string, quantity: number) => setLines((l) => l.map((x) => (x.id === id ? { ...x, quantity: clamp(quantity) } : x))), []);
  const remove = useCallback((id: string) => setLines((l) => l.filter((x) => x.id !== id)), []);
  const clear = useCallback(() => setLines([]), []);

  const sessionId = useCallback(() => session.current, []);
  const checkout = useCallback(async (delivery: DeliveryDetails, promoCode?: string, guard?: { token: string; company: string }) => {
    const res = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json", ...(await authHeader()) }, body: JSON.stringify({ sessionId: session.current, delivery, promoCode, ...guard, items: lines.map((l) => ({ id: l.id, quantity: l.quantity })) }) }).catch(() => null);
    const body = await res?.json().catch(() => null);
    if (body?.url) {
      window.location.href = body.url;
      return null;
    }
    return body?.error ?? "Checkout isn't available right now. Please try again.";
  }, [lines]);

  const value = useMemo(() => ({ lines, count: lines.reduce((n, l) => n + l.quantity, 0), subtotal: lines.reduce((n, l) => n + l.price_cents * l.quantity, 0), add, setQuantity, remove, clear, sessionId, welcome, checkout }), [lines, add, setQuantity, remove, clear, sessionId, welcome, checkout]);
  return <BasketContext.Provider value={value}>{children}</BasketContext.Provider>;
}
