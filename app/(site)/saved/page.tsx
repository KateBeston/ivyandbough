import type { Metadata } from "next";
import { SavedItems } from "@/components/SavedItems";

export const metadata: Metadata = { title: "Saved items | Ivy & Bough", robots: { index: false } };

export default function SavedPage() {
  return (
    <main className="shop-page">
      <h1 className="heading">Saved items</h1>
      <SavedItems />
    </main>
  );
}
