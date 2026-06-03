import * as XLSX from "xlsx";
import {
  generateSearchReportHTML,
  generateConversationHTML,
  generateAuditHTML,
  generateFinderHTML,
} from "./pdfGenerator";

interface ReportColumn {
  header: string;
  key: string;
  width?: number;
}

function createWorkbook(
  columns: ReportColumn[],
  rows: Record<string, unknown>[],
  sheetName: string,
  title: string
): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  const headerRow = columns.map((c) => c.header);
  const dataRows = rows.map((row) =>
    columns.map((c) => (row[c.key] != null ? row[c.key] : ""))
  );

  const ws = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);

  const colWidths = columns.map((c, i) => {
    const maxLen = Math.max(
      c.header.length,
      ...dataRows.map((r) => String(r[i] ?? "").length)
    );
    return { wch: Math.min(maxLen + 4, c.width ?? 50) };
  });
  ws["!cols"] = colWidths;

  const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
  for (let col = 0; col <= range.e.c; col++) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
    const cell = ws[cellRef];
    if (cell) {
      cell.s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "1E40AF" } },
        alignment: { horizontal: "center" },
      };
    }
  }

  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return wb;
}

function addSummarySheet(
  wb: XLSX.WorkBook,
  title: string,
  totalRows: number,
  generatedAt: string,
  extra?: Record<string, unknown>[]
) {
  const summaryData: unknown[][] = [
    [title],
    [""],
    ["Tổng số bản ghi", totalRows],
    ["Thời gian tạo", generatedAt],
  ];

  if (extra) {
    extra.forEach((item) => {
      const entries = Object.entries(item);
      entries.forEach(([k, v]) => summaryData.push([k, v]));
    });
  }

  const ws = XLSX.utils.aoa_to_sheet(summaryData);
  ws["!cols"] = [{ wch: 25 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, ws, "Tổng quan");
}

export function exportSearchReport(results: any[], filename: string): Buffer {
  const columns: ReportColumn[] = [
    { header: "STT", key: "stt", width: 8 },
    { header: "Từ khóa tìm kiếm", key: "query", width: 30 },
    { header: "Công cụ", key: "engine", width: 15 },
    { header: "Số kết quả", key: "resultCount", width: 15 },
    { header: "Thời gian (ms)", key: "duration", width: 15 },
    { header: "Ngày tạo", key: "createdAt", width: 20 },
  ];

  const rows = results.map((r, i) => ({
    stt: i + 1,
    query: r.query ?? "",
    engine: r.engine ?? "",
    resultCount: r.resultCount ?? 0,
    duration: r.duration ?? "",
    createdAt: r.createdAt
      ? new Date(r.createdAt).toLocaleString("vi-VN")
      : "",
  }));

  const wb = createWorkbook(columns, rows, "Kết quả tìm kiếm", "Báo cáo tìm kiếm");
  addSummarySheet(
    wb,
    "Báo cáo tìm kiếm",
    results.length,
    new Date().toLocaleString("vi-VN"),
    [
      {
        "Tổng tìm kiếm": results.length,
        "Engine phổ biến": getMostFrequent(results.map((r) => r.engine)),
      },
    ]
  );

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return Buffer.from(buffer);
}

export function exportConversationReport(
  messages: any[],
  filename: string
): Buffer {
  const columns: ReportColumn[] = [
    { header: "STT", key: "stt", width: 8 },
    { header: "Người gửi", key: "sender", width: 25 },
    { header: "Nội dung", key: "body", width: 50 },
    { header: "Cuộc trò chuyện", key: "conversationName", width: 25 },
    { header: "Ngày gửi", key: "createdAt", width: 20 },
  ];

  const rows = messages.map((m, i) => ({
    stt: i + 1,
    sender: m.sender?.email ?? m.sender?.name ?? "",
    body: m.body ?? "",
    conversationName: m.conversation?.name ?? "",
    createdAt: m.createdAt
      ? new Date(m.createdAt).toLocaleString("vi-VN")
      : "",
  }));

  const wb = createWorkbook(
    columns,
    rows,
    "Tin nhắn",
    "Báo cáo tin nhắn"
  );
  addSummarySheet(
    wb,
    "Báo cáo tin nhắn",
    messages.length,
    new Date().toLocaleString("vi-VN")
  );

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return Buffer.from(buffer);
}

export function exportAuditReport(logs: any[], filename: string): Buffer {
  const columns: ReportColumn[] = [
    { header: "STT", key: "stt", width: 8 },
    { header: "Hành động", key: "action", width: 25 },
    { header: "Người thực hiện", key: "actorEmail", width: 25 },
    { header: "Đối tượng", key: "targetType", width: 15 },
    { header: "ID đối tượng", key: "targetId", width: 25 },
    { header: "Email đối tượng", key: "targetEmail", width: 25 },
    { header: "Chi tiết", key: "metadata", width: 30 },
    { header: "Thời gian", key: "createdAt", width: 20 },
  ];

  const rows = logs.map((l, i) => ({
    stt: i + 1,
    action: l.action ?? "",
    actorEmail: l.actorEmail ?? "",
    targetType: l.targetType ?? "",
    targetId: l.targetId ?? "",
    targetEmail: l.targetEmail ?? "",
    metadata: l.metadata ? JSON.stringify(l.metadata) : "",
    createdAt: l.createdAt
      ? new Date(l.createdAt).toLocaleString("vi-VN")
      : "",
  }));

  const wb = createWorkbook(columns, rows, "Nhật ký", "Báo cáo audit");
  addSummarySheet(
    wb,
    "Báo cáo audit",
    logs.length,
    new Date().toLocaleString("vi-VN")
  );

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return Buffer.from(buffer);
}

export function exportFinderReport(rows: any[], filename: string): Buffer {
  const columns: ReportColumn[] = [
    { header: "STT", key: "stt", width: 8 },
    { header: "Tên khách sạn", key: "hotelName", width: 30 },
    { header: "Địa chỉ", key: "address", width: 40 },
    { header: "Trạng thái", key: "status", width: 15 },
    { header: "Phần trăm khớp", key: "percentage", width: 15 },
    { header: "Số link khớp", key: "matchedCount", width: 15 },
    { header: "URL khớp", key: "matchedUrls", width: 50 },
    { header: "Ngày tạo", key: "createdAt", width: 20 },
  ];

  const data = rows.map((r, i) => ({
    stt: i + 1,
    hotelName: r.hotelName ?? "",
    address: r.address ?? "",
    status: r.status ?? "",
    percentage: r.bestPercentage != null ? `${r.bestPercentage}%` : "",
    matchedCount: r.matchedLinks?.length ?? 0,
    matchedUrls: (r.matchedLinks ?? [])
      .map((l: any) => l.url)
      .join("\n"),
    createdAt: r.createdAt
      ? new Date(r.createdAt).toLocaleString("vi-VN")
      : "",
  }));

  const wb = createWorkbook(
    columns,
    data,
    "Kết quả Finder",
    "Báo cáo Finder"
  );
  addSummarySheet(
    wb,
    "Báo cáo Finder",
    rows.length,
    new Date().toLocaleString("vi-VN")
  );

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return Buffer.from(buffer);
}

function getMostFrequent(arr: string[]): string {
  if (!arr.length) return "";
  const counts = arr.reduce(
    (acc, val) => {
      acc[val] = (acc[val] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

export function exportSearchReportPDF(results: any[]): string {
  const date = new Date().toLocaleString("vi-VN");
  return generateSearchReportHTML(results, "Báo cáo tìm kiếm", date);
}

export function exportConversationReportPDF(messages: any[]): string {
  const date = new Date().toLocaleString("vi-VN");
  return generateConversationHTML(messages, "Báo cáo tin nhắn", date);
}

export function exportAuditReportPDF(logs: any[]): string {
  const date = new Date().toLocaleString("vi-VN");
  return generateAuditHTML(logs, "Báo cáo audit", date);
}

export function exportFinderReportPDF(rows: any[]): string {
  const date = new Date().toLocaleString("vi-VN");
  return generateFinderHTML(rows, "Báo cáo Finder", date);
}
