import type { ReactNode } from "react";

const safe = (url: string) => /^(https?:\/\/|\/)/.test(url);

function inline(text: string) {
  const parts: ReactNode[] = [];
  const pattern = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*/g;
  let last = 0;
  for (const m of text.matchAll(pattern)) {
    parts.push(text.slice(last, m.index));
    if (m[3]) parts.push(<strong key={m.index}>{m[3]}</strong>);
    else if (safe(m[2])) parts.push(<a key={m.index} href={m[2]}>{m[1]}</a>);
    else parts.push(m[1]);
    last = m.index + m[0].length;
  }
  parts.push(text.slice(last));
  return parts;
}

export function RichText({ text }: { text: string }) {
  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return <div className="article-text">{paragraphs.map((p, i) => <p key={i}>{inline(p)}</p>)}</div>;
}
