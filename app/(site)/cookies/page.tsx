import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const revalidate = 60;
export const metadata: Metadata = { title: "Cookie Policy | Ivy & Bough", description: "How Ivy & Bough uses cookies and similar technologies, and how to change your choice.", alternates: { canonical: "/cookies" } };

export default function Page() {
  return <LegalPage code="COOKIES" title="Cookie Policy" />;
}
