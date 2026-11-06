import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const revalidate = 60;
export const metadata: Metadata = { title: "Account Terms | Ivy & Bough", description: "The terms that apply to your Ivy & Bough customer account.", alternates: { canonical: "/account-terms" } };

export default function Page() {
  return <LegalPage code="ACCOUNT-TERMS" title="Account Terms" />;
}
