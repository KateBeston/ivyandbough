import type { Metadata } from "next";
import { OfferPage } from "@/components/OfferPage";

export const revalidate = 60;
export const metadata: Metadata = { title: "Sale | Ivy & Bough", description: "Shop sale Christmas decorations from Ivy & Bough.", alternates: { canonical: "/shop/sale" } };

export default function Page() {
  return <OfferPage kind="Sale" />;
}
