"use client";

import { useEffect, useState } from "react";
import { account } from "@/lib/account-client";
import type { Kind } from "@/lib/requests";
import { ContactForm } from "./ContactForm";
import { RequestFlow } from "./RequestFlow";

const tabs: { id: "Message" | Kind; label: string }[] = [
  { id: "Message", label: "Send a message" },
  { id: "Refund", label: "Request a refund or return" },
  { id: "Dispute", label: "Raise a dispute" },
];

export function ContactHub() {
  const [tab, setTab] = useState<"Message" | Kind>("Message");
  const [signedIn, setSignedIn] = useState(false);
  const [round, setRound] = useState(0);
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("type");
    if (t === "refund") setTab("Refund");
    if (t === "dispute") setTab("Dispute");
    account.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
  }, []);
  return (
    <>
      <div className="contact-tabs" role="tablist">
        {tabs.map((t) => <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? "on" : ""} onClick={() => { setTab(t.id); setRound((n) => n + 1); }}>{t.label}</button>)}
      </div>
      {tab === "Message" ? <ContactForm /> : <RequestFlow key={`${tab}-${round}-${signedIn}`} signedIn={signedIn} startKind={tab} />}
    </>
  );
}
