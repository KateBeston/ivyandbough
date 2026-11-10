import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLabelGuide } from "@/lib/labels";

export const revalidate = 300;
export const metadata: Metadata = { title: "What our labels mean | Ivy & Bough", description: "What the labels on our products mean, from vegan and plastic-free to handmade and certified organic.", alternates: { canonical: "/labels" } };

export default async function LabelsPage() {
  const guide = await getLabelGuide();
  if (!guide.length) notFound();
  return (
    <main className="legal labels-guide">
      <h1 className="heading">What our labels mean</h1>
      <p>Some of our products carry labels about how they&apos;re made, what they&apos;re made from and how they&apos;re packed. We only use a label when the maker or supplier tells us it applies, and here&apos;s exactly what each one means.</p>
      {guide.map((g) => (
        <section key={g.group}>
          <h2>{g.group}</h2>
          <dl>{g.items.map((i) => <div key={i.label}><dt>{i.label}</dt><dd>{i.meaning}</dd></div>)}</dl>
        </section>
      ))}
    </main>
  );
}
