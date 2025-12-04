const TOKEN_KEY = "schedule_token";
const TERM_KEY = "schedule_term";
const TOKEN_PARAM = "t";
const DEFAULT_TERM = "202509";

/**
 * Get the shared token from URL if present
 */
export function getSharedToken(): string | null {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(TOKEN_PARAM);
}

/**
 * Get the user's own token (from localStorage, creating if needed)
 */
export function getOwnToken(): string {
  let token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(TOKEN_KEY, token);
  }
  return token;
}

/**
 * Get the active token for API calls.
 * Always uses the user's own token - shared token is only used for joining.
 */
export function getToken(): string {
  return getOwnToken();
}

export function getTerm(): string {
  const urlParams = new URLSearchParams(window.location.search);
  const urlTerm = urlParams.get("term");

  if (urlTerm) {
    localStorage.setItem(TERM_KEY, urlTerm);
    return urlTerm;
  }

  return localStorage.getItem(TERM_KEY) || DEFAULT_TERM;
}

export function setTerm(term: string): void {
  localStorage.setItem(TERM_KEY, term);
}

export function getShareableUrl(term?: string): string {
  const token = getOwnToken();
  const url = new URL(window.location.href);
  url.searchParams.set(TOKEN_PARAM, token);
  if (term) {
    url.searchParams.set("term", term);
  }
  return url.toString();
}
