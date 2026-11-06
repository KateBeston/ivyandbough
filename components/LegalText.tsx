import Link from "next/link";
import type { ReactNode } from "react";
import { CookieSettingsLink } from "./CookieConsent";

function inline(text: string) {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(/\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*/g)) {
    parts.push(text.slice(last, m.index));
    if (m[3]) parts.push(<strong key={m.index}>{m[3]}</strong>);
    else if (m[2].startsWith("/")) parts.push(<Link key={m.index} href={m[2]}>{m[1]}</Link>);
    else if (/^(https:\/\/|mailto:)/.test(m[2])) parts.push(<a key={m.index} href={m[2]}>{m[1]}</a>);
    else parts.push(m[1]);
    last = m.index + m[0].length;
  }
  parts.push(text.slice(last));
  return parts;
}

const cells = (row: string) => row.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());

export function LegalText({ text }: { text: string }) {
  return (
    <>
      {text.split(/\n\s*\n/).map((raw, i) => {
        const block = raw.trim();
        if (!block) return null;
        if (block === "{{cookie_settings}}") return <p key={i}><CookieSettingsLink /></p>;
        if (block.startsWith("## ")) return <h2 key={i}>{block.slice(3)}</h2>;
        const lines = block.split("\n");
        if (lines.every((l) => l.startsWith("- "))) return <ul key={i}>{lines.map((l, n) => <li key={n}>{inline(l.slice(2))}</li>)}</ul>;
        if (lines.every((l) => /^\d+\. /.test(l))) return <ol key={i}>{lines.map((l, n) => <li key={n}>{inline(l.replace(/^\d+\. /, ""))}</li>)}</ol>;
        if (lines.length > 2 && lines.every((l) => l.startsWith("|"))) {
          return (
            <div key={i} className="legal-table">
              <table>
                <thead><tr>{cells(lines[0]).map((c, n) => <th key={n}>{c}</th>)}</tr></thead>
                <tbody>{lines.slice(2).map((l, r) => <tr key={r}>{cells(l).map((c, n) => <td key={n}>{inline(c)}</td>)}</tr>)}</tbody>
              </table>
            </div>
          );
        }
        return <p key={i}>{inline(block)}</p>;
      })}
    </>
  );
}
