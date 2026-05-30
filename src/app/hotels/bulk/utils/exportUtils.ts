import { MatchResult } from "./resultMatcher";

// `xlsx` is ~430KB and is only needed for the XLSX export action. It is loaded
// lazily inside downloadXLSX() so it stays out of the initial /hotels/bulk
// bundle; CSV/JSON export do not need it at all.

// Neutralize CSV/spreadsheet formula injection. Hotel names/addresses come
// from user-uploaded Excel files; a cell beginning with = + - @ (or a leading
// tab/CR) is interpreted as a formula when the export is reopened in Excel /
// Sheets, which can exfiltrate data or run commands. Prefixing with a single
// quote forces the spreadsheet to treat the value as literal text.
export function sanitizeCell(value: unknown): string {
  const s = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(s)) {
    return `'${s}`;
  }
  return s;
}

export function downloadCSV(results: MatchResult[], filename = "hotel_search_results.csv") {
  downloadBlob(buildCSV(results), filename, "text/csv;charset=utf-8;");
}

// Pure CSV serialization, split out from the download side-effect so it can be
// unit-tested. Pads each row to the widest matched-link count and escapes
// embedded quotes per RFC 4180.
export function buildCSV(results: MatchResult[]): string {
  const maxLinks = Math.max(...results.map((r) => r.matchedLinks.length), 1);
  const linkHeaders = Array.from({ length: maxLinks }, (_, i) => `Matched Link ${i + 1}`);

  const header = ["Order", "No", "Percentage", "Status", "Hotel Name", "Hotel Address", ...linkHeaders];
  const rows = results.map((r, i) => {
    const linkCols = r.matchedLinks.map((l) => `${l.url} (${l.percentage}%)`);
    while (linkCols.length < maxLinks) linkCols.push("");
    return [i + 1, r.no, `${r.bestPercentage}%`, r.status, r.hotelName, r.address, ...linkCols];
  });

  return [header, ...rows]
    .map((row) => row.map((c) => `"${sanitizeCell(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

export function downloadJSON(results: MatchResult[], filename = "hotel_search_results.json") {
  downloadBlob(JSON.stringify(buildJSONExport(results), null, 2), filename, "application/json");
}

export interface JSONExportRow {
  order: number;
  no: string;
  hotelName: string;
  address: string;
  percentage: number;
  status: MatchResult["status"];
  matchedLinks: { url: string; title: string; percentage: number }[];
}

// Pure JSON export shape, split from the download side-effect so the exported
// field contract (consumed by anything reading the JSON) can be unit-tested.
export function buildJSONExport(results: MatchResult[]): JSONExportRow[] {
  return results.map((r, i) => ({
    order: i + 1,
    no: r.no,
    hotelName: r.hotelName,
    address: r.address,
    percentage: r.bestPercentage,
    status: r.status,
    matchedLinks: r.matchedLinks.map((l) => ({
      url: l.url,
      title: l.title,
      percentage: l.percentage,
    })),
  }));
}

export async function downloadXLSX(results: MatchResult[], filename = "hotel_search_results.xlsx") {
  // Lazy-load xlsx so its weight is only paid when the user exports to XLSX.
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  // Sheet 1: Results
  const maxLinks = Math.max(...results.map((r) => r.matchedLinks.length), 1);
  const linkHeaders = Array.from({ length: maxLinks }, (_, i) => `Matched Link ${i + 1}`);
  const headers = ["Order", "No", "Percentage", "Status", "Fuzzy Score", "Hotel Name", "Hotel Address", "Total Links", ...linkHeaders];

  const rows = results.map((r, i) => {
    const linkCols = r.matchedLinks.map((l) => `${l.url} (${l.percentage}%)`);
    while (linkCols.length < maxLinks) linkCols.push("");
    return [
      i + 1,
      sanitizeCell(r.no),
      `${r.bestPercentage}%`,
      r.status,
      r.fuzzyScore ? `${(r.fuzzyScore * 100).toFixed(1)}%` : "",
      sanitizeCell(r.hotelName),
      sanitizeCell(r.address),
      r.matchedLinks.length,
      ...linkCols.map(sanitizeCell),
    ];
  });

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Auto-fit column widths
  const colWidths = headers.map((h, i) => {
    const maxLen = Math.max(
      h.length,
      ...rows.map((r) => String(r[i] || "").length)
    );
    return { wch: Math.min(maxLen + 2, 50) };
  });
  ws["!cols"] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, "Results");

  // Sheet 2: Summary
  const s = computeSummaryStats(results);

  const summaryData = [
    ["Hotel Search Summary"],
    [""],
    ["Total Hotels", results.length],
    ["Matched", s.matched],
    ["Not Matched", s.notMatched],
    ["Match Rate", `${s.matchRate}%`],
    ["Avg Percentage", `${s.avgPercent}%`],
    ["Max Percentage", `${s.maxPercent}%`],
    ["Min Percentage", `${s.minPercent}%`],
    ["High Confidence (>=70%)", s.highConf],
    ["Medium Confidence (40-69%)", s.medConf],
    ["Low Confidence (<40%)", s.lowConf],
    ["Total Links Found", s.totalLinks],
    ["Export Time", new Date().toLocaleString()],
  ];

  const ws2 = XLSX.utils.aoa_to_sheet(summaryData);
  ws2["!cols"] = [{ wch: 25 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, ws2, "Summary");

  XLSX.writeFile(wb, filename);
}

export interface SummaryStats {
  matched: number;
  notMatched: number;
  matchRate: number;
  avgPercent: number;
  maxPercent: number;
  minPercent: number;
  highConf: number;
  medConf: number;
  lowConf: number;
  totalLinks: number;
}

// Pure aggregation for the XLSX summary sheet, split out so the confidence
// bucket boundaries (>=70, 40-69, <40) and rate math can be unit-tested
// without invoking the XLSX/DOM write side-effect.
export function computeSummaryStats(results: MatchResult[]): SummaryStats {
  const matched = results.filter((r) => r.status === "matched").length;
  const notMatched = results.length - matched;
  const avgPercent = results.length
    ? Math.round(results.reduce((sum, r) => sum + r.bestPercentage, 0) / results.length)
    : 0;
  const maxPercent = results.length ? Math.max(...results.map((r) => r.bestPercentage)) : 0;
  const minPercent = results.length ? Math.min(...results.map((r) => r.bestPercentage)) : 0;
  return {
    matched,
    notMatched,
    matchRate: results.length ? Math.round((matched / results.length) * 100) : 0,
    avgPercent,
    maxPercent,
    minPercent,
    highConf: results.filter((r) => r.bestPercentage >= 70).length,
    medConf: results.filter((r) => r.bestPercentage >= 40 && r.bestPercentage < 70).length,
    lowConf: results.filter((r) => r.bestPercentage < 40).length,
    totalLinks: results.reduce((sum, r) => sum + r.matchedLinks.length, 0),
  };
}

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob(["\uFEFF" + content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
