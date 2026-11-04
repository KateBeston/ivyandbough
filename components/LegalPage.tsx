import type { ReactNode } from "react";
import { LEGAL_UPDATED } from "@/lib/legal";

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="prose legal-page">
      <h1>{title}</h1>
      <p className="muted">Last updated {LEGAL_UPDATED}</p>
      {children}
    </main>
  );
}
