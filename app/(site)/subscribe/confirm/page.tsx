import type { Metadata } from "next";
import Link from "next/link";
import { CopyCode, WelcomeAccount } from "@/components/WelcomeAccount";
import { offerText } from "@/lib/pricing";
import { codeTerms, unusedCode } from "@/lib/promotions";
import { admin } from "@/lib/server";
import { validSetup, validToken } from "@/lib/subscribe";

export const metadata: Metadata = { title: "Confirm your subscription | Ivy & Bough", robots: { index: false } };

async function hasAccount(email: string) {
  const { data } = await admin()?.from("customers").select("auth_user_id").eq("email", email).maybeSingle() ?? { data: null };
  return Boolean(data?.auth_user_id);
}

export default async function ConfirmPage({ searchParams }: { searchParams: Promise<{ e?: string; t?: string; s?: string; status?: string }> }) {
  const { e, t, s, status } = await searchParams;
  const email = (e ?? "").toLowerCase();
  const confirmed = (status === "done" || status === "offer") && Boolean(t) && validToken(email, t ?? "");
  const code = confirmed ? await unusedCode(email) : null;
  const setup = confirmed && s && validSetup(email, s) && !(await hasAccount(email)) ? s : "";

  if (confirmed) return (
    <main className="prose welcome-done">
      <h1>{code ? "You're in" : "Thank you, you're on the list"}</h1>
      {code && (
        <>
          <p>Here is {offerText(code)}. We&apos;ve emailed it to you too.</p>
          <div className="welcome-code"><strong>{code.code}</strong><CopyCode code={code.code} /></div>
          <p className="muted">Enter it in your basket before you check out. {codeTerms(code)}</p>
        </>
      )}
      <Link href="/shop" className="solid">Start shopping</Link>
      {setup && <WelcomeAccount email={email} setup={setup} />}
    </main>
  );

  return (
    <main className="prose">
      <h1>Your subscription</h1>
      {status === "invalid" || !e || !t ? <p>This link isn&apos;t valid. Please join again from our website.</p> : (
        <form action="/api/subscribe/confirm" method="post">
          <p>Please confirm you&apos;d like to receive emails from Ivy &amp; Bough.</p>
          <input type="hidden" name="e" value={e} />
          <input type="hidden" name="t" value={t} />
          <button type="submit" className="solid">Confirm my subscription</button>
        </form>
      )}
    </main>
  );
}
