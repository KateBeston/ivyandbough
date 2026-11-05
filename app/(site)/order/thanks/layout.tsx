import type { Metadata } from "next";

export const metadata: Metadata = { title: "Thank you for your order | Ivy & Bough", robots: { index: false, follow: false } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
