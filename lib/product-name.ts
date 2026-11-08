// The name used on baskets, orders, receipts and purchase orders, so each colour or scent is identified exactly.
export const fullName = (p: { name: string; version_name?: string | null }) => (p.version_name?.trim() ? `${p.name} – ${p.version_name.trim()}` : p.name);
