import Image from "next/image";
import Link from "next/link";
import type { Post, PostCategory } from "@/lib/catalogue";

export const href = (p: Post) => `/the-christmas-edit/${p.slug}`;

// The editorial category's page, from its name (category web addresses are the name in lower case with dashes).
export const catHref = (name: string) => `/the-christmas-edit/category/${name.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;

export function EditNav({ cats, posts, current }: { cats: PostCategory[]; posts: Post[]; current?: string }) {
  const used = cats.filter((c) => posts.some((p) => p.category === c.name));
  if (!used.length) return null;
  return (
    <nav className="edit-nav" aria-label="The Christmas Edit categories">
      <Link href="/the-christmas-edit" className={!current ? "on" : ""}>All stories</Link>
      {used.map((c) => <Link key={c.id} href={`/the-christmas-edit/category/${c.slug}`} className={current === c.slug ? "on" : ""}>{c.name}</Link>)}
      <Link href="/christmas-calculator">Tree &amp; lights calculator</Link>
    </nav>
  );
}

export function Card({ p, shape = "square", size = "", sizes = "(max-width: 760px) 50vw, 25vw" }: { p: Post; shape?: "square" | "circle" | "tall" | "wide"; size?: string; sizes?: string }) {
  return (
    <div className={`edit-card ${size}`}>
      <Link href={href(p)} tabIndex={-1} aria-hidden="true" className={`frame edit-card-photo ${shape}`}><Image src={p.image_url} alt="" fill sizes={sizes} className="cover" style={{ objectPosition: p.image_position }} /></Link>
      {p.category && <Link href={catHref(p.category)} className="edit-label">{p.category}</Link>}
      <Link href={href(p)} className="edit-card-title"><strong>{p.title}</strong></Link>
      <span className="edit-by">By {p.author}</span>
    </div>
  );
}

