import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { designStyle } from "@/lib/article-design";
import { Card, EditNav, href } from "@/components/EditCards";
import { getArticleDesign, getPostCategories, getPosts } from "@/lib/catalogue";

export const revalidate = 60;
export const metadata: Metadata = { title: "The Christmas Edit | Ivy & Bough", description: "Christmas decorating ideas, styling guides and table inspiration from Ivy & Bough.", alternates: { canonical: "/the-christmas-edit" } };


export default async function ChristmasEditPage() {
  const [posts, design, cats] = await Promise.all([getPosts(), getArticleDesign(), getPostCategories()]);
  // Each story is shown once, filling the page from the top: the lead story, a row of circles, a feature block, then a section per label.
  const lead = posts.find((p) => p.featured) ?? posts[0];
  const rest = posts.filter((p) => p !== lead);
  const circles = rest.splice(0, 4);
  const block = rest.length >= 6 ? { side: rest.splice(0, 2), main: rest.splice(0, 1)[0], latest: posts.filter((p) => p !== lead).slice(0, 5) } : null;
  const sections = [...new Set(rest.map((p) => p.category))].map((label) => ({ label, items: rest.filter((p) => p.category === label) }));

  return (
    <main className="edit-page" style={designStyle(design)}>
      <h1 className="sr-only">The Christmas Edit</h1>
      <EditNav cats={cats} posts={posts} />
      {!lead && <p className="centre" style={{ padding: "80px 16px" }}>New stories are on the way.</p>}
      {lead && (
        <Link href={href(lead)} className="edit-lead">
          <div className="frame edit-lead-photo"><Image src={lead.image_url} alt="" fill priority sizes="100vw" className="cover" style={{ objectPosition: lead.image_position }} /></div>
          <span className="edit-label">{lead.category}</span>
          <strong>{lead.title}</strong>
          <span className="edit-by">By {lead.author}</span>
        </Link>
      )}

      {circles.length > 0 && (
        <div className="edit-row">{circles.map((p) => <Card key={p.id} p={p} shape="circle" />)}</div>
      )}

      {block && (
        <div className="edit-block">
          <div className="edit-block-side">{block.side.map((p) => <Card key={p.id} p={p} />)}</div>
          <div className="edit-block-main"><Card p={block.main} shape="tall" size="big" sizes="(max-width: 760px) 100vw, 50vw" /></div>
          <aside className="edit-latest">
            <h2>The latest</h2>
            {block.latest.map((p) => (
              <Link key={p.id} href={href(p)}>
                <span><span className="edit-label">{p.category}</span><strong>{p.title}</strong><span className="edit-by">By {p.author}</span></span>
                <span className="frame"><Image src={p.image_url} alt="" fill sizes="80px" className="cover" style={{ objectPosition: p.image_position }} /></span>
              </Link>
            ))}
          </aside>
        </div>
      )}

      {sections.map((s) => (
        <section key={s.label} className="edit-section" aria-label={s.label}>
          <h2 className="edit-section-head">{s.label}</h2>
          <div className="edit-grid">{s.items.map((p) => <Card key={p.id} p={p} />)}</div>
        </section>
      ))}
    </main>
  );
}
