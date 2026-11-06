import type { Metadata } from "next";
import { LegalText } from "@/components/LegalText";
import { SignForm } from "@/components/SignForm";
import { admin } from "@/lib/server";
import { findRequest, whenBrisbane } from "@/lib/signing";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sign a document | Ivy & Bough", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function SignPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const r = await findRequest(token);
  if (!r) return <main className="prose"><h1>Sign a document</h1><p>This link isn&apos;t valid. Please contact Ivy &amp; Bough for a new one.</p></main>;
  const doc = r.legal_versions;
  const title = doc.legal_documents.title;
  if (r.status === "Signed") return <main className="prose"><h1>{title}</h1><p>This document was signed by {r.signed_name} on {r.signed_at ? whenBrisbane(r.signed_at) : ""}.</p><p><a href={`/api/sign/pdf?t=${token}`}>Download the signed copy</a></p></main>;
  if (r.status === "Cancelled" || new Date(r.expires_at) < new Date()) return <main className="prose"><h1>{title}</h1><p>This link has expired. Please contact Ivy &amp; Bough for a new one.</p></main>;
  if (!r.viewed_at) await admin()?.from("signature_requests").update({ viewed_at: new Date().toISOString(), status: "Viewed" }).eq("id", r.id).is("viewed_at", null);
  return (
    <main className="prose legal-page">
      <h1>{title}</h1>
      <p className="muted">Version {doc.version_id}, for {r.suppliers.name}</p>
      <LegalText text={doc.body} />
      <SignForm token={token} name={r.signer_name} company={r.suppliers.name} />
    </main>
  );
}
