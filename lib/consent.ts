export type Consent = "all" | "essential";
const KEY = "ib-consent";
export const CONSENT_EVENT = "ib-consent-changed";

export function readConsent(): Consent | null {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null") as { choice?: Consent; version?: number } | null;
    return saved?.version === 2 && saved.choice ? saved.choice : null;
  } catch {
    return null;
  }
}

export function saveConsent(choice: Consent) {
  const withdrawn = readConsent() === "all" && choice === "essential";
  try { localStorage.setItem(KEY, JSON.stringify({ choice, version: 2, at: new Date().toISOString() })); } catch { /* the banner returns on the next visit */ }
  if (withdrawn) {
    // Analytics can't be unloaded from a running page, so its cookies go and the page restarts.
    for (const name of document.cookie.split("; ").map((c) => c.split("=")[0]).filter((c) => c === "_ga" || c.startsWith("_ga_") || c === "_gid" || c === "_gcl_au")) {
      for (const domain of ["", `; domain=.${location.hostname.replace(/^www\./, "")}`]) document.cookie = `${name}=; Max-Age=0; path=/${domain}`;
    }
    location.reload();
    return;
  }
  window.dispatchEvent(new Event(CONSENT_EVENT));
}

// Any analytics or advertising script added later must check this first.
export const optionalCookiesAllowed = () => readConsent() === "all";
