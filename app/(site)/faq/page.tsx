import type { Metadata } from "next";
import { getFaqs } from "@/lib/catalogue";

export const revalidate = 60;
export const metadata: Metadata = { title: "Frequently Asked Questions | Ivy & Bough", description: "Answers to common questions about ordering, delivery, returns and products at Ivy & Bough." };

export default async function FaqPage() {
  const faqs = await getFaqs();
  const groups = [...new Set(faqs.map((f) => f.category))];
  const schema = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })) };
  return (
    <main className="prose faq-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
      <h1>Frequently asked questions</h1>
      {groups.map((group) => (
        <section key={group}>
          <h2>{group}</h2>
          {faqs.filter((f) => f.category === group).map((f) => (
            <details key={f.id} className="faq-item">
              <summary>{f.question}</summary>
              <p>{f.answer}</p>
            </details>
          ))}
        </section>
      ))}
    </main>
  );
}
