import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { designStyle } from "@/lib/article-design";
import { getArticleDesign, getPostCategories, getPosts } from "@/lib/catalogue";
import { Card, EditNav } from "@/components/EditCards";

export const revalidate = 60;
type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await getPostCategories()).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const cat = (await getPostCategories()).find((c) => c.slug === slug);
  if (!cat) return { title: "The Christmas Edit | Ivy & Bough" };
  return { title: `${cat.name} | The Christmas Edit | Ivy & Bough`, description: cat.description || `${cat.name} stories from The Christmas Edit by Ivy & Bough.`, alternates: { canonical: `/the-christmas-edit/category/${cat.slug}` } };
}

// One editorial category of The Christmas Edit, newest first.
export default async function EditCategoryPage({ params }: Props) {
  const { slug } = await params;
  const [cats, posts, design] = await Promise.all([getPostCategories(), getPosts(), getArticleDesign()]);
  const cat = cats.find((c) => c.slug === slug);
  if (!cat) notFound();
  const items = posts.filter((p) => p.category === cat.name);
  return (
    <main className="edit-page" style={designStyle(design)}>
      <EditNav cats={cats} posts={posts} current={cat.slug} />
      <header className="edit-cat-head">
        <h1 className="edit-section-head">{cat.name}</h1>
        {cat.description && <p>{cat.description}</p>}
      </header>
      {!items.length ? <p className="centre" style={{ padding: "40px 16px" }}>New stories are on the way.</p> : (
        <div className="edit-grid">{items.map((p) => <Card key={p.id} p={p} />)}</div>
      )}
    </main>
  );
}
