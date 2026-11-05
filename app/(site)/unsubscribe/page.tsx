import type { Metadata } from "next";
import { UnsubscribeForm } from "@/components/UnsubscribeForm";

export const metadata: Metadata = { title: "Unsubscribe | Ivy & Bough", robots: { index: false } };

export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ e?: string; t?: string; status?: string }> }) {
  const { e, t, status } = await searchParams;
  return (
    <main className="prose">
      <h1>Unsubscribe</h1>
      {status === "done" ? <p>You&apos;re unsubscribed. We won&apos;t send you any more marketing emails, but you&apos;ll still receive emails about your orders.</p>
        : status === "invalid" ? <p>This link isn&apos;t valid. Please enter your email below.</p> : null}
      {e && t && !status ? (
        <form action="/api/unsubscribe/confirm" method="post">
          <p>Please confirm you&apos;d like to stop receiving marketing emails from Ivy &amp; Bough.</p>
          <input type="hidden" name="e" value={e} />
          <input type="hidden" name="t" value={t} />
          <button type="submit" className="solid">Confirm unsubscribe</button>
        </form>
      ) : status !== "done" && <UnsubscribeForm />}
    </main>
  );
}
