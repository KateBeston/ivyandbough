import pages from "./colour-pages.json";
import type { Product } from "./catalogue";

// Colour landing pages ("Gold Christmas Decorations", "White Christmas Trees" and so on), each with its own
// written introduction and guide. Shop-wide pages live at /shop/colour/<colour>; category pages at /shop/<category>/<colour>.
export type ColourPage = { category_slug: string | null; colour: string; h1: string; seo_title: string; seo_description: string; intro: string; body: string };
export const COLOUR_PAGES = pages as ColourPage[];
export const SHOP_WIDE = "colour";

export const colourSlug = (c: string) => c.toLowerCase().replace(/[^a-z0-9]+/g, "-");
export const colourPath = (p: ColourPage) => `/shop/${p.category_slug ?? SHOP_WIDE}/${colourSlug(p.colour)}`;
export const findColourPage = (category: string, colour: string) => COLOUR_PAGES.find((p) => (p.category_slug ?? SHOP_WIDE) === category && colourSlug(p.colour) === colour);

const coloursOf = (p: Product) => [p.colours, ...(p.variants ?? []).map((v) => v.colours)].join(",").split(",").map((c) => c.replace(/[{}]/g, "").trim().toLowerCase());
export const hasColour = (p: Product, colour: string) => coloursOf(p).includes(colour.toLowerCase());
