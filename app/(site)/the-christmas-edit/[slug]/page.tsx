import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPost, getPosts } from "@/lib/catalogue";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPost((await params).slug);
  return { title: post ? `${post.title} | Ivy & Bough` : "Ivy & Bough", description: post?.excerpt };
}

const longDate = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: "Australia/Brisbane" });

export default async function PostPage({ params }: Props) {
  const post = await getPost((await params).slug);
  if (!post) notFound();
  const related = (await getPosts()).filter((p) => p.id !== post.id).slice(0, 3);
  return (
    <main>
      <section className="post-hero">
        <div className="post-hero-copy">
          <Link href="/the-christmas-edit" className="eyebrow">The Christmas Edit</Link>
          <h1>{post.title}</h1>
          <p>{post.excerpt}</p>
          <div className="post-meta">Ivy &amp; Bough · {longDate.format(new Date(post.published_at))}</div>
        </div>
        <div className="frame post-hero-photo">
          <Image src={post.image_url} alt={post.image_alt} fill priority sizes="(max-width: 760px) 100vw, 50vw" className="cover" style={{ objectPosition: post.image_position }} />
        </div>
      </section>
      <article className="post-sections">
        {post.sections.map((s) => (
          <section key={s.heading} className="post-section">
            <div className="frame post-section-photo"><Image src={s.image} alt={s.alt} fill sizes="(max-width: 760px) 100vw, 50vw" className="cover" style={{ objectPosition: s.position }} /></div>
            <div>
              <h2>{s.heading}</h2>
              <p>{s.text}</p>
            </div>
          </section>
        ))}
      </article>
      <section className="post-related">
        <h2 className="heading">More from The Christmas Edit</h2>
        <div className="journal-grid">
          {related.map((p) => (
            <Link key={p.id} href={`/the-christmas-edit/${p.slug}`} className="journal-card">
              <div className="frame" style={{ height: 280 }}><Image src={p.image_url} alt={p.image_alt} fill sizes="(max-width: 760px) 100vw, 33vw" className="cover" style={{ objectPosition: p.image_position }} /></div>
              <strong>{p.title}</strong>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
