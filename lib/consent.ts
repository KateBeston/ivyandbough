export type Consent = "all" | "essential";
const KEY = "ib-consent";

export function readConsent(): Consent | null {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null") as { choice?: Consent; version?: number } | null;
    return saved?.version === 1 && saved.choice ? saved.choice : null;
  } catch {
    return null;
  }
}

export function saveConsent(choice: Consent) {
  try { localStorage.setItem(KEY, JSON.stringify({ choice, version: 1, at: new Date().toISOString() })); } catch { /* the banner returns on the next visit */ }
}

// Any analytics or advertising script added later must check this first.
export const optionalCookiesAllowed = () => readConsent() === "all";
