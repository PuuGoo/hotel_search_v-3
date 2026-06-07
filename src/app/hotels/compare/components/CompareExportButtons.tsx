"use client";

import { FiFileText, FiFile } from "react-icons/fi";

interface HotelData {
  id: string;
  name: string;
  address: string;
  rating: number;
  priceRange: string;
  description: string;
  url: string;
  images: string[];
}

interface CompareExportButtonsProps {
  hotels: HotelData[];
}

function sanitizeCell(value: unknown): string {
  const s = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(s)) {
    return `'${s}`;
  }
  return s;
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

function downloadCSV(hotels: HotelData[]) {
  const header = ["Tên", "Địa chỉ", "Đánh giá", "Khoảng giá", "Mô tả", "URL"];
  const rows = hotels.map((h) => [
    h.name,
    h.address,
    `${h.rating} sao`,
    h.priceRange,
    h.description,
    h.url,
  ]);

  const csv = [header, ...rows]
    .map((row) =>
      row.map((c) => `"${sanitizeCell(c).replace(/"/g, '""')}"`).join(",")
    )
    .join("\n");

  const timestamp = new Date().toISOString().slice(0, 10);
  downloadBlob(csv, `hotel_comparison_${timestamp}.csv`, "text/csv;charset=utf-8;");
}

async function downloadXLSX(hotels: HotelData[]) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  const headers = ["Tên", "Địa chỉ", "Đánh giá", "Khoảng giá", "Mô tả", "URL"];
  const rows = hotels.map((h) => [
    sanitizeCell(h.name),
    sanitizeCell(h.address),
    h.rating,
    sanitizeCell(h.priceRange),
    sanitizeCell(h.description),
    h.url,
  ]);

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

  XLSX.utils.book_append_sheet(wb, ws, "So sánh khách sạn");

  // Summary sheet
  const avgRating = hotels.length
    ? (hotels.reduce((s, h) => s + h.rating, 0) / hotels.length).toFixed(1)
    : 0;
  const summaryData = [
    ["So sánh khách sạn - Tổng hợp"],
    [""],
    ["Tổng số khách sạn", hotels.length],
    ["Đánh giá trung bình", `${avgRating} sao`],
    ["Đánh giá cao nhất", `${Math.max(...hotels.map((h) => h.rating))} sao`],
    ["Thời gian xuất", new Date().toLocaleString()],
  ];

  const ws2 = XLSX.utils.aoa_to_sheet(summaryData);
  ws2["!cols"] = [{ wch: 25 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, ws2, "Tổng hợp");

  const timestamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `hotel_comparison_${timestamp}.xlsx`);
}

export default function CompareExportButtons({ hotels }: CompareExportButtonsProps) {
  if (hotels.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => {
          void downloadXLSX(hotels).catch(() => {});
        }}
        className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors"
      >
        <FiFile />
        XLSX ({hotels.length})
      </button>
      <button
        onClick={() => downloadCSV(hotels)}
        className="flex items-center gap-2 px-3 py-2 bg-fill hover:bg-hairline text-gray-200 rounded-lg text-sm transition-colors"
      >
        <FiFileText />
        CSV
      </button>
    </div>
  );
}
