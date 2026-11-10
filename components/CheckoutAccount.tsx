"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { account } from "@/lib/account-client";

export type SavedDetails = { name: string; phone: string; line1: string; line2: string; city: string; state: string; postcode: string };
type Address = { id: string; label: string; name: string; line1: string; line2: string; suburb: string; state: string; postcode: string };

const local = (phone: string) => phone.replace(/\D/g, "").replace(/^61/, "").replace(/^0/, "");

// Sits above the delivery details: sign in for saved details, or carry on as a guest.
export function CheckoutAccount({ onFill: fill }: { onFill: (d: Partial<SavedDetails>) => void }) {
  // Only fills what the account actually has, so anything already typed isn't wiped by a blank.
  const onFill = (d: Partial<SavedDetails>) => fill(Object.fromEntries(Object.entries(d).filter(([, v]) => v)) as Partial<SavedDetails>);
  const [user, setUser] = useState<{ email: string; name: string } | null | undefined>(undefined);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [profile, setProfile] = useState({ name: "", phone: "" });

  useEffect(() => {
    const load = async () => {
      const { data } = await account.auth.getSession();
      const session = data.session;
      if (!session) { setUser(null); return; }
      const [{ data: me }, { data: saved }] = await Promise.all([account.rpc("my_details"), account.from("customer_addresses").select("*").order("created_at")]);
      const details = (me ?? {}) as { name?: string; phone?: string };
      const list = (saved ?? []) as Address[];
      setProfile({ name: details.name ?? "", phone: details.phone ?? "" });
      setAddresses(list);
      setUser({ email: session.user.email ?? "", name: details.name || String(session.user.user_metadata?.full_name ?? "") });
      const first = list[0];
      onFill({ name: details.name || String(session.user.user_metadata?.full_name ?? "") || first?.name || "", phone: local(details.phone ?? ""), ...(first ? { line1: first.line1, line2: first.line2, city: first.suburb, state: first.state, postcode: first.postcode } : {}) });
    };
    load();
    const { data } = account.auth.onAuthStateChange((event) => { if (event === "SIGNED_OUT") setUser(null); });
    return () => data.subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function choose(id: string) {
    const a = addresses.find((x) => x.id === id);
    if (a) onFill({ name: profile.name || a.name, line1: a.line1, line2: a.line2, city: a.suburb, state: a.state, postcode: a.postcode });
  }

  if (user === undefined) return null;
  if (!user) {
    return (
      <div className="checkout-account">
        <p><strong>Have an account?</strong> <Link href="/account?next=/basket">Sign in</Link> for faster checkout, or continue as a guest below.</p>
      </div>
    );
  }
  return (
    <div className="checkout-account">
      <p>Checking out as {user.name ? <><strong>{user.name}</strong> ({user.email})</> : <strong>{user.email}</strong>}. <button type="button" className="link-button" onClick={() => account.auth.signOut()}>Not you?</button></p>
      {addresses.length > 1 && (
        <label className="checkout-address">Saved address
          <select defaultValue={addresses[0].id} onChange={(e) => choose(e.target.value)}>
            {addresses.map((a) => <option key={a.id} value={a.id}>{a.label || `${a.line1}, ${a.suburb}`}</option>)}
          </select>
        </label>
      )}
    </div>
  );
}
