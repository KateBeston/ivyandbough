import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const revalidate = 60;
export const metadata: Metadata = { title: "Website Terms of Use | Ivy & Bough", description: "The terms for using the Ivy & Bough website.", alternates: { canonical: "/terms" } };

export default function Page() {
  return <LegalPage code="WEBSITE-TERMS" title="Website Terms of Use" />;
}
