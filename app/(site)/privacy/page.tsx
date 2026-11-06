import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const revalidate = 60;
export const metadata: Metadata = { title: "Privacy Policy | Ivy & Bough", description: "How Ivy & Bough collects, uses and protects your personal information.", alternates: { canonical: "/privacy" } };

export default function Page() {
  return <LegalPage code="PRIVACY" title="Privacy Policy" />;
}
