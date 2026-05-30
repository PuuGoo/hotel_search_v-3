import { describe, it, expect } from "vitest";

import {
  normalizeWorkers,
  normalizeTemplate,
  hasXlsxExtension,
  MIN_WORKERS,
  MAX_WORKERS,
  DEFAULT_WORKERS,
  DEFAULT_TEMPLATE,
  VALID_TEMPLATES,
} from "./uploadValidation";

describe("normalizeWorkers", () => {
  it("clamps into the allowed range", () => {
    expect(normalizeWorkers("0")).toBe(MIN_WORKERS);
    expect(normalizeWorkers("10")).toBe(MAX_WORKERS);
    expect(normalizeWorkers("3")).toBe(3);
    expect(normalizeWorkers("-5")).toBe(MIN_WORKERS);
  });

  it("falls back to the default for non-numeric input", () => {
    expect(normalizeWorkers("abc")).toBe(DEFAULT_WORKERS);
    expect(normalizeWorkers(null)).toBe(DEFAULT_WORKERS);
    expect(normalizeWorkers(undefined)).toBe(DEFAULT_WORKERS);
    expect(normalizeWorkers("")).toBe(DEFAULT_WORKERS);
  });

  it("parses leading-numeric strings", () => {
    expect(normalizeWorkers("4abc")).toBe(4);
  });
});

describe("normalizeTemplate", () => {
  it("accepts each valid template", () => {
    for (const t of VALID_TEMPLATES) {
      expect(normalizeTemplate(t)).toBe(t);
    }
  });

  it("falls back to the default for unknown / non-string values", () => {
    expect(normalizeTemplate("bogus")).toBe(DEFAULT_TEMPLATE);
    expect(normalizeTemplate("")).toBe(DEFAULT_TEMPLATE);
    expect(normalizeTemplate(null)).toBe(DEFAULT_TEMPLATE);
    expect(normalizeTemplate(123)).toBe(DEFAULT_TEMPLATE);
  });
});

describe("hasXlsxExtension", () => {
  it("accepts .xlsx case-insensitively", () => {
    expect(hasXlsxExtension("data.xlsx")).toBe(true);
    expect(hasXlsxExtension("DATA.XLSX")).toBe(true);
    expect(hasXlsxExtension("a.b.xlsx")).toBe(true);
  });

  it("rejects other extensions and missing extensions", () => {
    expect(hasXlsxExtension("data.xls")).toBe(false);
    expect(hasXlsxExtension("data.csv")).toBe(false);
    expect(hasXlsxExtension("data")).toBe(false);
    expect(hasXlsxExtension("data.xlsx.exe")).toBe(false);
  });
});
