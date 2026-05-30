// `xlsx` is ~430KB and is only needed when a user actually uploads a file.
// Importing it statically pulled it into the initial /hotels/bulk bundle. It is
// loaded lazily inside parseExcelFile() instead so it is fetched on demand.

export interface ExcelRow {
  no: string;
  hotelName: string;
  address: string;
  urlType: string;
  raw: any[];
}

export interface ParsedExcel {
  fileName: string;
  headers: string[];
  rows: ExcelRow[];
  totalRows: number;
}

export interface ColumnIndices {
  nameIdx: number;
  addressIdx: number;
  noIdx: number;
  urlTypeIdx: number;
}

// Pure header-to-column detection, split out so it can be unit-tested without
// a file. Returns -1 for any column not found (only nameIdx is required).
export function detectColumns(headers: string[]): ColumnIndices {
  return {
    nameIdx: headers.findIndex((h) => /name|hotel.*name|child.*name|ten.*khach|ten/i.test(h)),
    addressIdx: headers.findIndex((h) => /address|dia.*chi|addr|child.*address/i.test(h)),
    noIdx: headers.findIndex((h) => /^no$|^#|stt|order|so.*thu.*tu/i.test(h)),
    urlTypeIdx: headers.findIndex((h) => /url.*type|type.*url/i.test(h)),
  };
}

// Pure transformation from a raw 2D sheet (array-of-arrays, as produced by
// XLSX.utils.sheet_to_json with { header: 1 }) into the typed ParsedExcel.
// Extracted from parseExcelFile's FileReader callback so the real logic —
// empty-row filtering, header trimming, min-rows + missing-name validation, and
// column->row mapping — is unit-testable without a File, FileReader, or xlsx.
// Throws on the same validation failures the callback used to reject with.
export function buildParsedExcel(jsonData: any[][], fileName: string): ParsedExcel {
  // Drop fully-empty rows (blank lines, trailing rows) before validating.
  const filtered = jsonData.filter((row) =>
    Array.isArray(row) &&
    row.some((cell) => cell !== undefined && cell !== null && cell !== "")
  );

  if (filtered.length < 2) {
    throw new Error("File Excel phải có ít nhất 1 header + 1 dữ liệu");
  }

  const headers = filtered[0].map((h: any) => String(h || "").trim());
  const dataRows = filtered.slice(1);

  const { nameIdx, addressIdx, noIdx, urlTypeIdx } = detectColumns(headers);

  if (nameIdx === -1) {
    throw new Error(
      'Không tìm thấy cột "Hotel Name". Header phải chứa "name" hoặc "hotel name"'
    );
  }

  const rows: ExcelRow[] = dataRows.map((row) => ({
    no: noIdx >= 0 ? String(row[noIdx] || "") : "",
    hotelName: String(row[nameIdx] || "").trim(),
    address: addressIdx >= 0 ? String(row[addressIdx] || "").trim() : "",
    urlType: urlTypeIdx >= 0 ? String(row[urlTypeIdx] || "").trim() : "",
    raw: row,
  }));

  return { fileName, headers, rows, totalRows: rows.length };
}

export async function parseExcelFile(file: File): Promise<ParsedExcel> {
  // Lazy-load xlsx so its ~430KB cost is paid only on first upload, not on
  // initial page load. Dynamic import resolves to the same module shape.
  const XLSX = await import("xlsx");

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

        // All parsing/validation logic lives in the pure helper so it can be
        // tested directly; here we only handle the IO + error mapping.
        resolve(buildParsedExcel(jsonData, file.name));
      } catch (err) {
        // A validation error from buildParsedExcel already has a user-facing
        // Vietnamese message; preserve it. Anything else is a genuine
        // read/parse failure, so map it to the generic format message.
        if (err instanceof Error && /Excel|Hotel Name/.test(err.message)) {
          reject(err);
        } else {
          reject(new Error("Không thể đọc file Excel. Đảm bảo file đúng định dạng .xlsx"));
        }
      }
    };
    reader.onerror = () => reject(new Error("Lỗi đọc file"));
    reader.readAsArrayBuffer(file);
  });
}

export function validateExcelFile(file: File): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!ext || !["xlsx", "xls"].includes(ext)) {
    return "Chỉ chấp nhận file .xlsx hoặc .xls";
  }
  if (file.size > 20 * 1024 * 1024) {
    return "File quá lớn (tối đa 20MB)";
  }
  return null;
}
