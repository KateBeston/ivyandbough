import type { Metadata } from "next";
import Link from "next/link";
import { Calculator } from "./Calculator";

export const metadata: Metadata = {
  title: "Christmas Tree and Lights Calculator | Ivy & Bough",
  description: "Work out what size Christmas tree fits your room, and how many lights, baubles and how much ribbon you need to decorate it.",
  alternates: { canonical: "/christmas-calculator" },
};

export default function CalculatorPage() {
  return (
    <main className="prose calc-page">
      <p className="eyebrow">The Christmas Edit · Guides</p>
      <h1>Christmas Tree &amp; Lights Calculator</h1>
      <p>Enter your ceiling height to find the right size tree, then see roughly how many lights and baubles, and how much ribbon, you&apos;ll need to decorate it.</p>
      <Calculator />
      <h2>How we work it out</h2>
      <p>We leave about 30 cm between the top of the tree and the ceiling, for the topper and a little breathing space. For lights we allow about 100 per 30 cm of tree for a classic look and 150 for a full glow. Baubles are about 8 per 30 cm for a classic look and 12 for a full look, and ribbon is about three times the height of the tree. Every tree and every style is different, so treat these as a starting point.</p>
      <p>For more, read <Link href="/the-christmas-edit/christmas-tree-guide">The Christmas Tree Guide</Link> and <Link href="/the-christmas-edit/christmas-lights-guide">The Christmas Lights Guide</Link>.</p>
    </main>
  );
}
