import { Bodoni_Moda, Cormorant_Garamond, DM_Serif_Display, EB_Garamond, Gilda_Display, Lato, Libre_Caslon_Display, Libre_Caslon_Text, Lora, Marcellus, Playfair_Display, Prata, Source_Serif_4 } from "next/font/google";
import type { CSSProperties } from "react";

const marcellus = Marcellus({ subsets: ["latin"], display: "swap", preload: false, weight: "400" });
const cormorant = Cormorant_Garamond({ subsets: ["latin"], display: "swap", preload: false, weight: ["400", "500"] });
const bodoni = Bodoni_Moda({ subsets: ["latin"], display: "swap", preload: false, weight: "400" });
const playfair = Playfair_Display({ subsets: ["latin"], display: "swap", preload: false, weight: "400" });
const lato = Lato({ subsets: ["latin"], display: "swap", preload: false, weight: ["400", "700"] });
const lora = Lora({ subsets: ["latin"], display: "swap", preload: false, weight: ["400", "600"] });
const garamond = EB_Garamond({ subsets: ["latin"], display: "swap", preload: false, weight: ["400", "600"] });
const caslon = Libre_Caslon_Display({ subsets: ["latin"], display: "swap", preload: false, weight: "400" });
const gilda = Gilda_Display({ subsets: ["latin"], display: "swap", preload: false, weight: "400" });
const prata = Prata({ subsets: ["latin"], display: "swap", preload: false, weight: "400" });
const dmSerif = DM_Serif_Display({ subsets: ["latin"], display: "swap", preload: false, weight: "400" });
const caslonText = Libre_Caslon_Text({ subsets: ["latin"], display: "swap", preload: false, weight: ["400", "700"], style: ["normal", "italic"] });
const sourceSerif = Source_Serif_4({ subsets: ["latin"], display: "swap", preload: false, weight: ["400", "600"], style: ["normal", "italic"] });

const headingFonts: Record<string, string> = { forum: "var(--serif)", marcellus: marcellus.style.fontFamily, cormorant: cormorant.style.fontFamily, bodoni: bodoni.style.fontFamily, playfair: playfair.style.fontFamily, caslon: caslon.style.fontFamily, gilda: gilda.style.fontFamily, prata: prata.style.fontFamily, dmserif: dmSerif.style.fontFamily };
const bodyFonts: Record<string, string> = { montserrat: "var(--sans)", lato: lato.style.fontFamily, lora: lora.style.fontFamily, garamond: garamond.style.fontFamily, caslontext: caslonText.style.fontFamily, sourceserif: sourceSerif.style.fontFamily };
const ratios: Record<string, string> = { square: "1 / 1", landscape: "3 / 2", portrait: "4 / 5" };

export type ArticleDesign = { headingFont: string; bodyFont: string; titleSize: number; headingSize: number; bodySize: number; capitals: boolean; columnWidth: number; imageShape: string; divider: string; heroSide: string; dropCap: boolean };

export const defaultDesign: ArticleDesign = { headingFont: "forum", bodyFont: "montserrat", titleSize: 44, headingSize: 34, bodySize: 17, capitals: true, columnWidth: 700, imageShape: "square", divider: "none", heroSide: "stacked", dropCap: true };

export const ratio = (shape?: string) => ratios[shape ?? ""];

export function designStyle(d: ArticleDesign) {
  return {
    "--a-head": headingFonts[d.headingFont] ?? headingFonts.forum,
    "--a-body": bodyFonts[d.bodyFont] ?? bodyFonts.montserrat,
    "--a-title": `${d.titleSize}px`,
    "--a-h2": `${d.headingSize}px`,
    "--a-size": `${d.bodySize}px`,
    "--a-case": d.capitals ? "uppercase" : "none",
    "--a-track": d.capitals ? ".11em" : ".01em",
    "--a-col": `${d.columnWidth}px`,
    "--a-ratio": ratios[d.imageShape] ?? ratios.square,
  } as CSSProperties;
}
