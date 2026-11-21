import type { Metadata } from "next";
import Link from "next/link";
import { Calculator } from "./Calculator";
import { JsonLd } from "@/components/JsonLd";

// Answers match the calculator's own working (see Calculator.tsx).
const FAQS = [
  { q: "What size Christmas tree fits a 2.4 m ceiling?", a: "Allowing about 30 cm for a topper and space above it, a tree of up to about 2.1 m fits." },
  { q: "How many lights do I need for a 1.8 m Christmas tree?", a: "About 600 for a classic look, or 900 for a full glow." },
  { q: "How many baubles do I need for a 1.8 m Christmas tree?", a: "About 50 in mixed sizes for a classic look, or 70 for a full look." },
  { q: "How much ribbon do I need for a Christmas tree?", a: "About three times the tree's height, so around 6 m for a 1.8 m tree." },
  { q: "How wide is a 1.8 m Christmas tree?", a: "A full 1.8 m tree is roughly 110 cm wide at the base. A slim one is around 70 cm." },
];

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
      <h3>Tree height</h3>
      <p>We leave about 30 cm between the top of the tree and the ceiling, for the topper and a little breathing space.</p>
      <h3>Lights</h3>
      <p>About 100 lights per 30 cm of tree for a classic look, and 150 for a full glow.</p>
      <h3>Baubles</h3>
      <p>About 8 baubles per 30 cm for a classic look, and 12 for a full look, in mixed sizes.</p>
      <h3>Ribbon or garland</h3>
      <p>About three times the height of the tree, to wind around it.</p>
      <h3>Tree width</h3>
      <p>A full tree is roughly 60% as wide as it is tall, and a slim tree about 40%. Leave about 30 cm of clear space around it.</p>
      <p>Every tree and every style is different, so treat these as a starting point.</p>
      <section className="article-faq" aria-labelledby="calc-faq">
        <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }} />
        <h2 id="calc-faq">Frequently asked questions</h2>
        {FAQS.map((f) => (
          <details key={f.q}>
            <summary>{f.q}</summary>
            <p>{f.a}</p>
          </details>
        ))}
      </section>
      <p>For more, read <Link href="/the-christmas-edit/christmas-tree-guide">The Christmas Tree Guide</Link> and <Link href="/the-christmas-edit/christmas-lights-guide">The Christmas Lights Guide</Link>.</p>
      <section className="article-about" aria-labelledby="calc-about">
        <h2 id="calc-about">About Ivy &amp; Bough</h2>
        <p>Ivy &amp; Bough is a Brisbane-based online Christmas store. We choose every tree and decoration we sell, and write our guides for decorating in Australian homes and summers.</p>
      </section>
    </main>
  );
}
