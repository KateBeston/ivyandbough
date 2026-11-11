// The shop's Colour filter. Product "colours" must use these exact names or the product won't show when filtered.
export const FILTER_COLOURS = ["Red", "Burgundy", "Green", "Gold", "Silver", "White", "Ivory", "Champagne", "Blush", "Pink", "Blue", "Black", "Brown", "Natural", "Multicolour"];

// Nearest filter colour for common descriptive names.
const NEAREST: Record<string, string> = {
  scarlet: "Red", crimson: "Red", cherry: "Red",
  plum: "Burgundy", wine: "Burgundy", maroon: "Burgundy", oxblood: "Burgundy",
  sage: "Green", olive: "Green", emerald: "Green", "forest green": "Green", pine: "Green", eucalyptus: "Green",
  mustard: "Gold", brass: "Gold", copper: "Gold",
  grey: "Silver", gray: "Silver", pewter: "Silver",
  cream: "Ivory", "off-white": "Ivory", "off white": "Ivory",
  "dusty pink": "Blush", "dusty rose": "Blush", "rose gold": "Champagne",
  coral: "Pink", fuchsia: "Pink",
  navy: "Blue", "navy blue": "Blue", teal: "Blue",
  charcoal: "Black",
  kraft: "Brown", "kraft brown": "Brown", tan: "Brown", amber: "Brown", "dark amber": "Brown", "burnt orange": "Brown", wood: "Brown", timber: "Brown",
  hessian: "Natural", jute: "Natural", beige: "Natural",
  multi: "Multicolour", multicolor: "Multicolour", "multi-coloured": "Multicolour", rainbow: "Multicolour",
};

// Turns the writer's free colour names into filter colours, nearest match first, no duplicates. Unknown names are dropped.
export function toFilterColours(text: string): string {
  const out: string[] = [];
  let other = 0;
  for (const raw of text.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)) {
    const exact = FILTER_COLOURS.find((c) => c.toLowerCase() === raw);
    const hit = exact ?? NEAREST[raw] ?? NEAREST[raw.replace(/^(light|dark|deep|pale|soft|bright|antique|matte)\s+/, "")];
    if (hit) { if (!out.includes(hit)) out.push(hit); } else if (raw !== "clear") other++;
  }
  // Several bright colours the filter has no name for (yellow, orange, purple…) read as multicoloured.
  if (other >= 2 && !out.includes("Multicolour")) out.push("Multicolour");
  return out.join(", ");
}
