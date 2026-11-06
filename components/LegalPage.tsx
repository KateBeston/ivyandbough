import type { ReactNode } from "react";
import { LEGAL_UPDATED } from "@/lib/legal";
import { publishedVersionId } from "@/lib/legal-register";

export async function LegalPage({ title, code, children }: { title: string; code: string; children: ReactNode }) {
  const version = await publishedVersionId(code).catch(() => "");
  return (
    <main className="prose legal-page">
      <h1>{title}</h1>
      <p className="muted">Last updated {LEGAL_UPDATED}</p>
      {version && <p className="muted legal-version">Version {version}</p>}
      {children}
    </main>
  );
}
