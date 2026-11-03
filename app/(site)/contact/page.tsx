import type { Metadata } from "next";
import { ContactForm } from "@/components/ContactForm";

export const metadata: Metadata = { title: "Contact | Ivy & Bough" };

export default function ContactPage() {
  return (
    <main className="prose">
      <h1>Contact</h1>
      <p>We&apos;d love to hear from you, whether you have a question about a piece or an order.</p>
      <ContactForm />
    </main>
  );
}
