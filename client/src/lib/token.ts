const TOKEN_KEY = "schedule_token";
const TERM_KEY = "schedule_term";
const TOKEN_PARAM = "t";
const DEFAULT_TERM = "202509";

export function getToken(): string {
  const urlParams = new URLSearchParams(window.location.search);
  const urlToken = urlParams.get(TOKEN_PARAM);

  if (urlToken) {
    localStorage.setItem(TOKEN_KEY, urlToken);
    return urlToken;
  }

  let token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(TOKEN_KEY, token);
  }
  return token;
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
  const token = getToken();
  const url = new URL(window.location.href);
  url.searchParams.set(TOKEN_PARAM, token);
  if (term) {
    url.searchParams.set("term", term);
  }
  return url.toString();
}
