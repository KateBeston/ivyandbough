"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { account } from "@/lib/account-client";

type Address = { id: string; label: string; name: string; line1: string; line2: string; suburb: string; state: string; postcode: string };
const KEY = "ib-ship-to";

// Shows a signed-in customer's delivery postcode, with their full address in a small window.
export function ShipTo({ shipsFrom }: { shipsFrom: string }) {
  const [list, setList] = useState<Address[]>([]);
  const [me, setMe] = useState<{ name: string; phone: string }>({ name: "", phone: "" });
  const [pick, setPick] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    (async () => {
      const { data: s } = await account.auth.getSession();
      if (!s.session) return;
      const [{ data: details }, { data: saved }] = await Promise.all([account.rpc("my_details"), account.from("customer_addresses").select("id,label,name,line1,line2,suburb,state,postcode").order("created_at")]);
      const d = (details ?? {}) as { name?: string; phone?: string };
      setMe({ name: d.name ?? "", phone: d.phone ?? "" });
      const rows = (saved ?? []) as Address[];
      setList(rows);
      let chosen = "";
      try { chosen = localStorage.getItem(KEY) ?? ""; } catch { /* storage unavailable */ }
      setPick(rows.some((r) => r.id === chosen) ? chosen : rows[0]?.id ?? "");
    })();
  }, []);

  const current = list.find((a) => a.id === pick);
  useEffect(() => { if (current) window.dispatchEvent(new CustomEvent("ib:postcode", { detail: current.postcode })); }, [current]);

  function choose(id: string) {
    setPick(id);
    try { localStorage.setItem(KEY, id); } catch { /* storage unavailable */ }
  }

  return (
    <div className="ship-to">
      <span><span className="muted">Ships from</span> {shipsFrom || "Australia"}</span>
      {current ? (
        <button type="button" className="ship-to-btn" onClick={() => dialog.current?.showModal()}><span className="muted">Ships to</span> <strong>{current.postcode}</strong> ›</button>
      ) : (
        <span><span className="muted">Ships to</span> Australia-wide</span>
      )}
      <dialog ref={dialog} className="ship-dialog" aria-labelledby="ship-title" onClick={(e) => { if (e.target === dialog.current) dialog.current?.close(); }}>
        <div className="ship-dialog-head"><h2 id="ship-title">Shipping details</h2><button type="button" aria-label="Close" onClick={() => dialog.current?.close()}>×</button></div>
        {current && (
          <>
            <p className="ship-label">Ship to</p>
            <address className="ship-address">
              {current.name || me.name}<br />
              {current.line1}{current.line2 ? <>, {current.line2}</> : null}<br />
              {current.suburb} {current.state} {current.postcode} AUS
              {me.phone ? <><br />{me.phone}</> : null}
            </address>
          </>
        )}
        {list.length > 1 && (
          <fieldset className="ship-choices">
            <legend>Deliver somewhere else</legend>
            {list.map((a) => <label key={a.id} className="check-line"><input type="radio" name="ship-to" checked={a.id === pick} onChange={() => choose(a.id)} /><span>{a.label || a.name}: {a.suburb} {a.postcode}</span></label>)}
          </fieldset>
        )}
        <p className="muted"><Link href="/account?tab=addresses">Manage your addresses</Link>. You can also change the address at checkout.</p>
      </dialog>
    </div>
  );
}
