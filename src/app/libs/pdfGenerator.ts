interface ReportColumn {
  header: string;
  key: string;
}

export interface SearchHistoryRecord {
  query?: string;
  engine?: string;
  resultCount?: number;
  duration?: number;
  createdAt?: string | Date;
}

export interface ConversationMessage {
  sender?: { email?: string; name?: string };
  body?: string;
  conversation?: { name?: string };
  createdAt?: string | Date;
}

export interface AuditLogEntry {
  action?: string;
  actorEmail?: string;
  targetType?: string;
  targetId?: string;
  metadata?: unknown;
  createdAt?: string | Date;
}

export interface FinderResult {
  hotelName?: string;
  address?: string;
  status?: string;
  bestPercentage?: number | null;
  matchedLinks?: { url: string }[];
  createdAt?: string | Date;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const PRINT_CSS = `
  @page { margin: 15mm; size: A4 landscape; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1a1a1a; background: #fff; padding: 20px; font-size: 12px; }
  .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #1e40af; padding-bottom: 12px; margin-bottom: 16px; }
  .header-left { display: flex; align-items: center; gap: 12px; }
  .logo { width: 40px; height: 40px; background: #1e40af; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: bold; font-size: 18px; }
  .title { font-size: 20px; font-weight: 700; color: #1e40af; }
  .meta { font-size: 11px; color: #6b7280; margin-top: 2px; }
  .summary { background: #f0f7ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 10px 14px; margin-bottom: 16px; display: flex; gap: 24px; font-size: 11px; }
  .summary-item span { font-weight: 600; color: #1e40af; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background: #1e40af; color: #fff; padding: 8px 10px; text-align: left; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
  td { padding: 7px 10px; border-bottom: 1px solid #e5e7eb; color: #374151; }
  tr:nth-child(even) td { background: #f9fafb; }
  tr:hover td { background: #f0f7ff; }
  .footer { margin-top: 16px; padding-top: 10px; border-top: 1px solid #d1d5db; display: flex; justify-content: space-between; font-size: 10px; color: #9ca3af; }
  @media print { body { padding: 0; } .no-print { display: none !important; } }
`;

function buildHTML(title: string, date: string, summary: string[], columns: ReportColumn[], rows: Record<string, unknown>[]): string {
  const safeTitle = escapeHtml(title);
  const safeDate = escapeHtml(date);
  const summaryHTML = summary.map((s) => `<div class="summary-item">${s}</div>`).join("");

  const headerCells = columns.map((c) => `<th>${escapeHtml(c.header)}</th>`).join("");
  const bodyRows = rows.map((row) => {
    const cells = columns.map((c) => {
      const val = row[c.key];
      return `<td>${val != null ? escapeHtml(String(val)) : ""}</td>`;
    }).join("");
    return `<tr>${cells}</tr>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle}</title>
  <style>${PRINT_CSS}</style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <div class="logo">H</div>
      <div>
        <div class="title">${safeTitle}</div>
        <div class="meta">Ngày tạo: ${safeDate}</div>
      </div>
    </div>
  </div>
  ${summary.length > 0 ? `<div class="summary">${summaryHTML}</div>` : ""}
  <table>
    <thead><tr>${headerCells}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
  <div class="footer">
    <span>Hệ thống quản lý khách sạn</span>
    <span>Trang 1 / 1</span>
  </div>
</body>
</html>`;
}

export function generateSearchReportHTML(results: SearchHistoryRecord[], title: string, date: string): string {
  const columns: ReportColumn[] = [
    { header: "STT", key: "stt" },
    { header: "Từ khóa tìm kiếm", key: "query" },
    { header: "Công cụ", key: "engine" },
    { header: "Số kết quả", key: "resultCount" },
    { header: "Thời gian (ms)", key: "duration" },
    { header: "Ngày tạo", key: "createdAt" },
  ];

  const rows = results.map((r, i) => ({
    stt: i + 1,
    query: r.query ?? "",
    engine: r.engine ?? "",
    resultCount: r.resultCount ?? 0,
    duration: r.duration ?? "",
    createdAt: r.createdAt ? new Date(r.createdAt).toLocaleString("vi-VN") : "",
  }));

  const engines = [...new Set(results.map((r) => r.engine).filter(Boolean))];
  const summary = [
    `<span>Tổng số:</span> ${results.length} bản ghi`,
    `<span>Engine:</span> ${engines.join(", ") || "N/A"}`,
    `<span>Thời gian:</span> ${date}`,
  ];

  return buildHTML(title, date, summary, columns, rows);
}

export function generateConversationHTML(messages: ConversationMessage[], title: string, date: string): string {
  const columns: ReportColumn[] = [
    { header: "STT", key: "stt" },
    { header: "Người gửi", key: "sender" },
    { header: "Nội dung", key: "body" },
    { header: "Cuộc trò chuyện", key: "conversationName" },
    { header: "Ngày gửi", key: "createdAt" },
  ];

  const rows = messages.map((m, i) => ({
    stt: i + 1,
    sender: m.sender?.email ?? m.sender?.name ?? "",
    body: m.body ?? "",
    conversationName: m.conversation?.name ?? "",
    createdAt: m.createdAt ? new Date(m.createdAt).toLocaleString("vi-VN") : "",
  }));

  const summary = [
    `<span>Tổng số:</span> ${messages.length} tin nhắn`,
    `<span>Thời gian:</span> ${date}`,
  ];

  return buildHTML(title, date, summary, columns, rows);
}

export function generateAuditHTML(logs: AuditLogEntry[], title: string, date: string): string {
  const columns: ReportColumn[] = [
    { header: "STT", key: "stt" },
    { header: "Hành động", key: "action" },
    { header: "Người thực hiện", key: "actorEmail" },
    { header: "Đối tượng", key: "targetType" },
    { header: "ID đối tượng", key: "targetId" },
    { header: "Chi tiết", key: "metadata" },
    { header: "Thời gian", key: "createdAt" },
  ];

  const rows = logs.map((l, i) => ({
    stt: i + 1,
    action: l.action ?? "",
    actorEmail: l.actorEmail ?? "",
    targetType: l.targetType ?? "",
    targetId: l.targetId ?? "",
    metadata: l.metadata ? JSON.stringify(l.metadata) : "",
    createdAt: l.createdAt ? new Date(l.createdAt).toLocaleString("vi-VN") : "",
  }));

  const actions = [...new Set(logs.map((l) => l.action).filter(Boolean))];
  const summary = [
    `<span>Tổng số:</span> ${logs.length} bản ghi`,
    `<span>Hành động:</span> ${actions.join(", ") || "N/A"}`,
    `<span>Thời gian:</span> ${date}`,
  ];

  return buildHTML(title, date, summary, columns, rows);
}

export function generateFinderHTML(rows: FinderResult[], title: string, date: string): string {
  const columns: ReportColumn[] = [
    { header: "STT", key: "stt" },
    { header: "Tên khách sạn", key: "hotelName" },
    { header: "Địa chỉ", key: "address" },
    { header: "Trạng thái", key: "status" },
    { header: "Phần trăm khớp", key: "percentage" },
    { header: "Số link khớp", key: "matchedCount" },
    { header: "URL khớp", key: "matchedUrls" },
    { header: "Ngày tạo", key: "createdAt" },
  ];

  const data = rows.map((r, i) => ({
    stt: i + 1,
    hotelName: r.hotelName ?? "",
    address: r.address ?? "",
    status: r.status ?? "",
    percentage: r.bestPercentage != null ? `${r.bestPercentage}%` : "",
    matchedCount: r.matchedLinks?.length ?? 0,
    matchedUrls: (r.matchedLinks ?? []).map((l) => l.url).join("\\n"),
    createdAt: r.createdAt ? new Date(r.createdAt).toLocaleString("vi-VN") : "",
  }));

  const matched = rows.filter((r) => r.status === "matched").length;
  const summary = [
    `<span>Tổng số:</span> ${rows.length} kết quả`,
    `<span>Khớp:</span> ${matched} khách sạn`,
    `<span>Thời gian:</span> ${date}`,
  ];

  return buildHTML(title, date, summary, columns, data);
}

export function printHTML(html: string): void {
  const printWindow = window.open("", "_blank", "width=1100,height=800");
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 500);
}

export function downloadHTMLAsPDF(html: string, filename: string): void {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.replace(/\.pdf$/i, "") + ".html";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
