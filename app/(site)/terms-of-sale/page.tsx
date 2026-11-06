import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const revalidate = 60;
export const metadata: Metadata = { title: "Terms of Sale | Ivy & Bough", description: "The terms that apply when you buy from Ivy & Bough, including payment, delivery and returns.", alternates: { canonical: "/terms-of-sale" } };

export default function Page() {
  return <LegalPage code="TERMS-OF-SALE" title="Terms of Sale" />;
}
