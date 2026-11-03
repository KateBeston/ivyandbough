import type { Metadata } from "next";

export const metadata: Metadata = { title: "Returns | Ivy & Bough" };

export default function ReturnsPage() {
  return (
    <main className="prose">
      <h1>Returns</h1>
      <p>Our goods come with guarantees that cannot be excluded under the Australian Consumer Law.</p>
      <p>[Add your change-of-mind policy, how to request a return, and what to do if a piece arrives damaged.]</p>
    </main>
  );
}
