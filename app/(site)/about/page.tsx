import type { Metadata } from "next";

export const metadata: Metadata = { title: "About | Ivy & Bough" };

export default function AboutPage() {
  return (
    <main className="prose">
      <h1>About Ivy &amp; Bough</h1>
      <p>Ivy &amp; Bough brings together elegant, unique Christmas pieces for the table, the tree and the front door.</p>
      <p>[A short note from Kate about why Ivy &amp; Bough began.]</p>
    </main>
  );
}
