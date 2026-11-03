import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CollectionHero } from "@/components/CollectionHero";
import { getPost } from "@/lib/catalogue";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPost((await params).slug);
  return { title: post ? `${post.title} | Ivy & Bough` : "Ivy & Bough", description: post?.excerpt };
}

export default async function PostPage({ params }: Props) {
  const post = await getPost((await params).slug);
  if (!post) notFound();
  return (
    <main>
      <CollectionHero title={post.title} intro={post.excerpt} src={post.image_url} alt={post.image_alt} position={post.image_position} />
      <article className="prose">
        {post.body.split(/\n\s*\n/).map((block, i) => block.startsWith("## ") ? <h2 key={i}>{block.slice(3)}</h2> : <p key={i}>{block}</p>)}
        <p style={{ marginTop: 36 }}><Link href="/journal" className="text-link">Back to the Journal</Link></p>
      </article>
    </main>
  );
}
