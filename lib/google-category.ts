// Maps our category names to Google's product taxonomy (Pinterest and Merchant Center both read it).
// Numbers are Google taxonomy IDs; text paths are used where we only need the parent branch.
const BY_NAME: Record<string, string> = {
  Ornaments: "3144", Baubles: "3144", Toppers: "3144", "Pet Ornaments": "3144",
  Candles: "588", "Home Fragrance": "592",
  Figurines: "5609", Nutcrackers: "5609",
  "Fairy Lights": "Home & Garden > Lighting > Light Ropes & Strings", "Curtain Lights": "Home & Garden > Lighting > Light Ropes & Strings",
  "Tree Stands & Storage": "6603", "Tree Skirts": "5504",
  Wreaths: "6267", Garlands: "6267", Swags: "6267",
  "Picks & Stems": "6265",
  "Pet Stockings": "5991", Stockings: "5991",
  "Christmas Villages": "505809",
  "Table Linen": "Home & Garden > Linens & Bedding > Table Linens",
  Tableware: "Home & Garden > Kitchen & Dining > Tableware", "Hosting Essentials": "Home & Garden > Kitchen & Dining > Tableware",
  "Drinkware & Barware": "Home & Garden > Kitchen & Dining > Tableware > Drinkware",
  Cards: "Arts & Entertainment > Party & Celebration > Gift Giving > Greeting & Note Cards",
  "Bon Bons": "Arts & Entertainment > Party & Celebration > Party Supplies", "Napkins & Party Pieces": "Arts & Entertainment > Party & Celebration > Party Supplies",
};
const SEASONAL = "596"; // Home & Garden > Decor > Seasonal & Holiday Decorations

export function googleCategory(categoryName?: string | null): string {
  return (categoryName && BY_NAME[categoryName]) || SEASONAL;
}
