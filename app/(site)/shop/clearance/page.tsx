import type { Metadata } from "next";
import { OfferPage } from "@/components/OfferPage";

export const revalidate = 60;
export const metadata: Metadata = { title: "Clearance | Ivy & Bough", description: "Shop clearance Christmas decorations from Ivy & Bough.", alternates: { canonical: "/shop/clearance" } };

export default function Page() {
  return <OfferPage kind="Clearance" />;
}
