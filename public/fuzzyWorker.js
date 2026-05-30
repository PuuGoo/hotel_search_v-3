// Fuzzy matching Web Worker
// Runs scoring off the main thread for performance

function normalize(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
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

function jaroWinkler(s1, s2) {
  if (s1 === s2) return 1;
  const len1 = s1.length;
  const len2 = s2.length;
  if (len1 === 0 || len2 === 0) return 0;

  const matchDistance = Math.floor(Math.max(len1, len2) / 2) - 1;
  const s1Matches = new Array(len1).fill(false);
  const s2Matches = new Array(len2).fill(false);
  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, len2);
    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  const jaro =
    (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;

  // Winkler modification
  let prefix = 0;
  for (let i = 0; i < Math.min(4, len1, len2); i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }

  return jaro + prefix * 0.1 * (1 - jaro);
}

function scoreCandidate(query, candidate, opts) {
  const q = normalize(query);
  const c = normalize(opts.titleOnly ? candidate : candidate);

  if (!q || !c) return 0;
  if (q === c) return 1;

  // Title prefix match
  if (c.startsWith(q) || q.startsWith(c)) return 1;

  // Token permutation match
  const qTokens = q.split(" ").filter(Boolean);
  const cTokens = c.split(" ").filter(Boolean);
  const generic = new Set(["hotel", "resort", "the", "and", "or", "in", "at"]);
  const significantTokens = qTokens.filter((t) => !generic.has(t));
  const matchedSig = significantTokens.filter((t) => cTokens.includes(t)).length;
  if (significantTokens.length > 0 && matchedSig === significantTokens.length) return 1;

  // Token sequence match
  let seqIdx = 0;
  for (const t of cTokens) {
    if (seqIdx < qTokens.length && t === qTokens[seqIdx]) seqIdx++;
  }
  if (seqIdx === qTokens.length) return 1;

  // Levenshtein + JaroWinkler average
  const lev = levenshtein(q, c);
  const maxLen = Math.max(q.length, c.length);
  const levSim = 1 - lev / maxLen;
  const jwSim = jaroWinkler(q, c);

  return (levSim + jwSim) / 2;
}

self.addEventListener("message", function (e) {
  const { type, query, candidates, opts } = e.data;

  if (type === "score") {
    const results = candidates.map((c) => {
      const candidateText = opts && opts.titleOnly ? c.title || c.url : c.url || c.title || "";
      const score = scoreCandidate(query, candidateText, opts || {});
      return { ...c, fuzzyScore: score };
    });

    self.postMessage({ type: "scored", query, results });
  }
});
