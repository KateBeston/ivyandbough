"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { account } from "@/lib/account-client";

type Wishlist = { ids: string[]; has: (id: string) => boolean; toggle: (id: string) => void; count: number };
const Ctx = createContext<Wishlist | null>(null);
export const useWishlist = () => useContext(Ctx)!;
const KEY = "ib-wishlist";
const readLocal = (): string[] => { try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; } };
const writeLocal = (ids: string[]) => { try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch { /* storage unavailable */ } };

// Saved items live in the account when signed in, and in this browser otherwise.
// Signing in moves anything saved as a guest into the account.
export function WishlistProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);
  const [user, setUser] = useState<string | null>(null);

  const sync = useCallback(async (uid: string | null) => {
    setUser(uid);
    const local = readLocal();
    if (!uid) return setIds(local);
    if (local.length) {
      await account.from("wishlist_items").upsert(local.map((product_id) => ({ product_id })), { onConflict: "auth_user_id,product_id", ignoreDuplicates: true });
      writeLocal([]);
    }
    const { data } = await account.from("wishlist_items").select("product_id").order("created_at", { ascending: false });
    setIds(((data ?? []) as { product_id: string }[]).map((r) => r.product_id));
  }, []);

  useEffect(() => {
    account.auth.getSession().then(({ data }) => sync(data.session?.user.id ?? null));
    const { data: sub } = account.auth.onAuthStateChange((_e, s) => { sync(s?.user.id ?? null); });
    return () => sub.subscription.unsubscribe();
  }, [sync]);

  const toggle = useCallback((id: string) => {
    setIds((cur) => {
      const on = cur.includes(id);
      const next = on ? cur.filter((x) => x !== id) : [id, ...cur];
      if (user) {
        if (on) account.from("wishlist_items").delete().eq("product_id", id).then(() => null);
        else account.from("wishlist_items").insert({ product_id: id }).then(() => null);
      } else writeLocal(next);
      return next;
    });
  }, [user]);

  return <Ctx.Provider value={{ ids, has: (id) => ids.includes(id), toggle, count: ids.length }}>{children}</Ctx.Provider>;
}
