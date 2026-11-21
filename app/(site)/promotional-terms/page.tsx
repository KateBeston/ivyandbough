import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const revalidate = 60;
export const metadata: Metadata = { title: "Promotional Terms | Ivy & Bough", description: "The rules for Ivy & Bough promotions and discount codes, and the details of current and recent offers.", alternates: { canonical: "/promotional-terms" } };

export default function Page() {
  return <LegalPage code="PROMO-TERMS" title="Promotional Terms" />;
}
