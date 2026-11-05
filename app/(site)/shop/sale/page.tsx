import type { Metadata } from "next";
import { OfferPage } from "@/components/OfferPage";

export const revalidate = 60;
export const metadata: Metadata = { title: "Sale | Ivy & Bough", description: "Shop sale Christmas decorations from Ivy & Bough." };

export default function Page() {
  return <OfferPage kind="Sale" />;
}
