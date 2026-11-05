import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getPosts } from "@/lib/catalogue";

export const revalidate = 60;
export const metadata: Metadata = { title: "The Christmas Edit | Ivy & Bough", description: "Christmas decorating ideas, styling guides and table inspiration from Ivy & Bough.", alternates: { canonical: "/the-christmas-edit" } };

export default async function JournalPage() {
  const posts = await getPosts();
  return (
    <main className="collection-body">
      <div className="centre">
        <h1 className="heading">The Christmas Edit</h1>
        <p style={{ marginTop: 10 }}>Ideas for a beautiful Christmas at home.</p>
      </div>
      <div className="journal-grid">
        {posts.map((p) => (
          <Link key={p.id} href={`/the-christmas-edit/${p.slug}`} className="journal-card">
            <div className="frame" style={{ height: 340 }}><Image src={p.image_url} alt={p.image_alt} fill sizes="(max-width: 760px) 100vw, 33vw" className="cover" style={{ objectPosition: p.image_position }} /></div>
            <strong>{p.title}</strong>
            <span>{p.excerpt}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
