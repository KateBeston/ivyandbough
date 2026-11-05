import type { Metadata } from "next";

export const metadata: Metadata = { title: "Confirm your subscription | Ivy & Bough", robots: { index: false } };

export default async function ConfirmPage({ searchParams }: { searchParams: Promise<{ e?: string; t?: string; status?: string }> }) {
  const { e, t, status } = await searchParams;
  return (
    <main className="prose">
      <h1>Your subscription</h1>
      {status === "done" ? <p>Thank you, you&apos;re on the list.</p> : status === "invalid" || !e || !t ? <p>This link isn&apos;t valid. Please join again from our website.</p> : (
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
