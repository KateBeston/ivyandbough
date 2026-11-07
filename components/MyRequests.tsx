"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { account } from "@/lib/account-client";
import { RESPONSE_HOURS } from "@/lib/requests";
import { RequestFlow } from "./RequestFlow";

type Req = { id: string; reference: string; kind: string; category: string; issues: string[]; items: { name: string; quantity: number }[]; order_number: string; comment: string; photos: string[]; status: string; outcome: string; created_at: string };
const when = (v: string) => new Intl.DateTimeFormat("en-AU", { dateStyle: "medium", timeStyle: "short", timeZone: "Australia/Brisbane" }).format(new Date(v));

export function MyRequests() {
  const [rows, setRows] = useState<Req[] | null>(null);
  const [open, setOpen] = useState(false);
  const [focus, setFocus] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const load = useCallback(async () => {
    const { data } = await account.from("customer_requests").select("id,reference,kind,category,issues,items,order_number,comment,photos,status,outcome,created_at").order("created_at", { ascending: false });
    setRows((data ?? []) as Req[]);
  }, []);
  useEffect(() => { load(); setFocus(new URLSearchParams(window.location.search).get("ref") ?? ""); }, [load]);
  useEffect(() => { if (open) dialog.current?.showModal(); else dialog.current?.close(); }, [open]);

  return (
    <div className="my-requests">
      <div className="my-requests-head">
        <p>Request a refund or return, or raise a dispute about an order. We respond within {RESPONSE_HOURS} hours.</p>
        <button type="button" className="solid" onClick={() => setOpen(true)}>Start a request</button>
      </div>
      {!rows ? <p>Loading your requests.</p> : !rows.length ? <p className="muted">You haven&apos;t made any requests.</p> : rows.map((r) => (
        <details key={r.id} className="order-card" open={r.reference === focus}>
          <summary><strong>{r.reference}</strong><span>{r.kind === "Refund" ? "Refund request" : "Dispute"}</span><span>{when(r.created_at)}</span><span className={`request-status s-${r.status.toLowerCase().replace(/\s+/g, "-")}`}>{r.status}</span></summary>
          <dl className="request-overview">
            {r.order_number && <><dt>Order</dt><dd>{r.order_number}</dd></>}
            <dt>About</dt><dd>{r.category}</dd>
            <dt>Issues</dt><dd>{r.issues.join(", ")}</dd>
            {r.items.length > 0 && <><dt>Items</dt><dd>{r.items.map((i) => `${i.quantity} × ${i.name}`).join(", ")}</dd></>}
            {r.comment && <><dt>Your comments</dt><dd>{r.comment}</dd></>}
            <dt>Photos</dt><dd>{r.photos.length || "None"}</dd>
            {r.outcome && <><dt>Our response</dt><dd>{r.outcome}</dd></>}
          </dl>
        </details>
      ))}
      <dialog ref={dialog} className="request-dialog" onClose={() => setOpen(false)} aria-label="Start a request">
        {open && <RequestFlow signedIn onClose={() => setOpen(false)} onSubmitted={() => load()} />}
      </dialog>
    </div>
  );
}
