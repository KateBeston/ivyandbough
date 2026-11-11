"use client";

import Link from "next/link";
import { useState } from "react";

const SIZES = [60, 90, 120, 150, 180, 210, 240, 270];
const metres = (cm: number) => `${(cm / 100).toFixed(cm % 100 ? 1 : 1)} m`;
const roundTo = (n: number, step: number) => Math.max(step, Math.round(n / step) * step);

export function Calculator() {
  const [ceiling, setCeiling] = useState("240");
  const [tree, setTree] = useState<number | null>(null);
  const [look, setLook] = useState<"classic" | "full">("classic");

  const c = Number(ceiling);
  const valid = c >= 120 && c <= 600;
  const fits = SIZES.filter((s) => s <= c - 30);
  const suggested = valid ? fits.at(-1) ?? 60 : null;
  const height = tree ?? suggested ?? 180;
  const per30 = height / 30;
  const lights = roundTo(per30 * (look === "full" ? 150 : 100), 50);
  const baubles = roundTo(per30 * (look === "full" ? 12 : 8), 5);
  const ribbon = Math.ceil((height / 100) * 3);
  const fullWidth = Math.round(height * 0.6 / 10) * 10;
  const slimWidth = Math.round(height * 0.4 / 10) * 10;
  const skirt = fullWidth + 30 <= 100 ? 90 : 120;

  return (
    <div className="calc">
      <div className="calc-inputs">
        <label>Ceiling height (cm)
          <input type="number" inputMode="numeric" min={120} max={600} value={ceiling} onChange={(e) => { setCeiling(e.target.value); setTree(null); }} />
        </label>
        <label>Tree height
          <select value={height} onChange={(e) => setTree(Number(e.target.value))}>
            {SIZES.map((s) => <option key={s} value={s} disabled={valid && s > c - 30}>{metres(s)}{s === suggested ? " (suggested)" : ""}</option>)}
          </select>
        </label>
        <fieldset>
          <legend>Look</legend>
          <label className="calc-radio"><input type="radio" name="look" checked={look === "classic"} onChange={() => setLook("classic")} /> Classic</label>
          <label className="calc-radio"><input type="radio" name="look" checked={look === "full"} onChange={() => setLook("full")} /> Full glow</label>
        </fieldset>
      </div>
      {!valid ? <p className="calc-note">Enter a ceiling height between 120 and 600 cm.</p> : (
        <>
          <p className="calc-lead">For a {metres(c)} ceiling, a <strong>{metres(suggested!)}</strong> tree is the best fit.</p>
          <div className="calc-results">
            <div><span>Lights</span><strong>{lights}</strong><small>LED lights</small></div>
            <div><span>Baubles</span><strong>{baubles}</strong><small>in mixed sizes</small></div>
            <div><span>Ribbon or garland</span><strong>{ribbon} m</strong><small>to wind around</small></div>
            <div><span>Width at the base</span><strong>{fullWidth} cm</strong><small>full tree, or about {slimWidth} cm slim</small></div>
            <div><span>Tree skirt</span><strong>{skirt} cm</strong><small>across</small></div>
          </div>
          <p className="calc-note">Leave about 30 cm of clear space around the tree so people can walk past.</p>
          <div className="calc-links">
            <Link className="solid" href="/search?q=christmas+tree">Shop Christmas trees</Link>
            <Link className="solid" href="/search?q=lights">Shop lights</Link>
          </div>
        </>
      )}
    </div>
  );
}
