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
  return (
    <div className="article-text">
      {paragraphs.map((p, i) => {
        if (p.startsWith("## ")) return <h2 key={i}>{p.slice(3)}</h2>;
        const lines = p.split("\n").map((l) => l.trim()).filter(Boolean);
        // A block where every line starts with "- " or "1. " is a list.
        if (lines.length > 1 && lines.every((l) => l.startsWith("- "))) return <ul key={i}>{lines.map((l, j) => <li key={j}>{inline(l.slice(2))}</li>)}</ul>;
        const lead = lines[0] && !/^\d+\.\s/.test(lines[0]) ? lines[0] : "";
        const items = lead ? lines.slice(1) : lines;
        if (items.length > 1 && items.every((l) => /^\d+\.\s/.test(l))) return <div key={i}>{lead && <p>{inline(lead)}</p>}<ol>{items.map((l, j) => <li key={j}>{inline(l.replace(/^\d+\.\s/, ""))}</li>)}</ol></div>;
        return <p key={i}>{inline(p)}</p>;
      })}
    </div>
  );
}
