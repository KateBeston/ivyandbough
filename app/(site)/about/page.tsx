import type { Metadata } from "next";

export const metadata: Metadata = { title: "About | Ivy & Bough", description: "Ivy & Bough is an online Christmas store bringing together elegant pieces for the table, the tree and the front door.", alternates: { canonical: "/about" } };

export default function AboutPage() {
  return (
    <main className="prose">
      <h1>About Ivy &amp; Bough</h1>
      <p>Ivy &amp; Bough exists to make Christmas at home feel special.</p>
      <p>We&apos;re an online Christmas store bringing together elegant pieces for the table, the tree and the front door. Our style sits somewhere between a beautifully dressed old house and the warmth of a family living room.</p>
      <p>The range is arranged into collections, from Traditional to Winter Wonderland to Bordeaux Glamour, so it&apos;s easy to choose a look and carry it through your whole home.</p>
      <p>Our pieces come from a mix of suppliers and makers we have chosen for their style and quality. Some ship directly to your door from them.</p>
      <p>We want to be the place you come back to each December, and for every order to feel like the night the tree goes up.</p>
    </main>
  );
}
