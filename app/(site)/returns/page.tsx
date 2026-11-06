import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const revalidate = 60;
export const metadata: Metadata = { title: "Returns | Ivy & Bough", description: "How to return an Ivy & Bough order, and what to do if something arrives damaged or isn't right.", alternates: { canonical: "/returns" } };

export default function Page() {
  return <LegalPage code="RETURNS" title="Returns" />;
}
