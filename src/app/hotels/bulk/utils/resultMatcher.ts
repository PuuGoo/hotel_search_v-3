export interface MatchedLink {
  url: string;
  title: string;
  percentage: number;
  score?: number;
}

export interface MatchResult {
  hotelName: string;
  address: string;
  no: string;
  matchedLinks: MatchedLink[];
  bestPercentage: number;
  status: "matched" | "no_match";
  fuzzyScore?: number;
  fuzzyBreakdown?: any;
}

function normalizeToken(token: string): string {
  return token
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isHotelNameInPage(
  hotelNameTokens: string[],
  pageTitle: string,
  pageUrl: string
): { status: boolean; percentage: number } {
  const normalizedTitle = normalizeToken(pageTitle);
  const tokens = hotelNameTokens.filter(Boolean).map(normalizeToken).filter(Boolean);

  if (tokens.length === 0) return { status: false, percentage: 0 };

  let tokenMatches = 0;
  for (const t of tokens) {
    if (normalizedTitle.includes(t)) tokenMatches++;
  }

  const percentage = Math.round((tokenMatches / tokens.length) * 100);
  return { status: percentage >= 30, percentage };
}

const EXCLUDED_DOMAINS = [
  "tripadvisor",
  "guestreservations",
  "youtube.com",
  "facebook.com",
  "instagram.com",
  "twitter.com",
  "wikipedia.org",
];

const PRIORITY_DOMAINS = [
  { pattern: "trip.com", priority: 4 },
  { pattern: "booking.com", priority: 3 },
  { pattern: "hotels.com", priority: 2 },
  { pattern: "agoda.com", priority: 2 },
  { pattern: "expedia.com", priority: 2 },
];

function getDomainPriority(url: string): number {
  for (const d of PRIORITY_DOMAINS) {
    if (url.includes(d.pattern)) return d.priority;
  }
  return 1;
}

export function matchHotelResults(
  hotelName: string,
  address: string,
  searchResults: any[],
  apiScore?: number
): MatchResult {
  const nameTokens = hotelName.split(/\s+/).filter(Boolean);
  const matchedLinks: MatchedLink[] = [];

  for (const result of searchResults) {
    const title = result.title || "";
    const url = result.url || "";
    const content = result.content || result.snippet || "";

    // Skip excluded domains
    if (EXCLUDED_DOMAINS.some((d) => url.toLowerCase().includes(d))) continue;

    // Only keep .com domains (like hotel_search_v2)
    if (!url.includes(".com")) continue;

    const match = isHotelNameInPage(nameTokens, title + " " + content, url);
    if (match.status) {
      matchedLinks.push({
        url,
        title,
        percentage: match.percentage,
        score: result.score,
      });
    }
  }

  // Sort by priority then percentage
  matchedLinks.sort((a, b) => {
    const pA = getDomainPriority(a.url);
    const pB = getDomainPriority(b.url);
    if (pA !== pB) return pB - pA;
    return b.percentage - a.percentage;
  });

  const bestPercentage = matchedLinks.length > 0 ? matchedLinks[0].percentage : 0;

  return {
    hotelName,
    address,
    no: "",
    matchedLinks,
    bestPercentage,
    status: matchedLinks.length > 0 ? "matched" : "no_match",
  };
}

// Fuzzy matching functions (for Web Worker or inline)
export function fuzzyNormalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

export function fuzzyScore(query: string, candidate: string): number {
  const q = fuzzyNormalize(query);
  const c = fuzzyNormalize(candidate);

  if (!q || !c) return 0;
  if (q === c) return 1;

  // Check if title starts with query
  if (c.startsWith(q) || q.startsWith(c)) return 1;

  // Check token permutation match
  const qTokens = q.split(" ").filter(Boolean);
  const cTokens = c.split(" ").filter(Boolean);
  const matched = qTokens.filter((t) => cTokens.includes(t)).length;
  if (matched === qTokens.length && qTokens.length > 0) return 1;

  // Levenshtein similarity
  const maxLen = Math.max(q.length, c.length);
  const dist = levenshtein(q, c);
  return 1 - dist / maxLen;
}
