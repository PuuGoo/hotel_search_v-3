import { describe, it, expect } from "vitest";

import { buildParsedExcel, detectColumns, validateExcelFile } from "./excelParser";

// validateExcelFile only reads .name and .size, so a minimal stub suffices.
const fakeFile = (name: string, size = 1000) =>
  ({ name, size } as unknown as File);

describe("detectColumns", () => {
  it("detects standard English headers", () => {
    const c = detectColumns(["No", "Hotel Name", "Hotel Address", "URL Type"]);
    expect(c.noIdx).toBe(0);
    expect(c.nameIdx).toBe(1);
    expect(c.addressIdx).toBe(2);
    expect(c.urlTypeIdx).toBe(3);
  });

  it("detects the finder-style child_ headers", () => {
    const c = detectColumns(["child_hotel_name", "child_hotel_address"]);
    expect(c.nameIdx).toBe(0);
    expect(c.addressIdx).toBe(1);
  });

  it("detects Vietnamese headers", () => {
    const c = detectColumns(["STT", "Ten khach san", "Dia chi"]);
    expect(c.noIdx).toBe(0);
    expect(c.nameIdx).toBe(1);
    expect(c.addressIdx).toBe(2);
  });

  it("is case-insensitive", () => {
    const c = detectColumns(["HOTEL NAME", "ADDRESS"]);
    expect(c.nameIdx).toBe(0);
    expect(c.addressIdx).toBe(1);
  });

  it("returns -1 for columns that are absent", () => {
    const c = detectColumns(["Hotel Name"]);
    expect(c.nameIdx).toBe(0);
    expect(c.addressIdx).toBe(-1);
    expect(c.noIdx).toBe(-1);
    expect(c.urlTypeIdx).toBe(-1);
  });

  it("matches '#' as the order column", () => {
    const c = detectColumns(["#", "Name"]);
    expect(c.noIdx).toBe(0);
  });
});

describe("validateExcelFile", () => {
  it("accepts .xlsx and .xls", () => {
    expect(validateExcelFile(fakeFile("hotels.xlsx"))).toBeNull();
    expect(validateExcelFile(fakeFile("hotels.xls"))).toBeNull();
  });

  it("is case-insensitive on the extension", () => {
    expect(validateExcelFile(fakeFile("HOTELS.XLSX"))).toBeNull();
  });

  it("rejects non-Excel extensions", () => {
    expect(validateExcelFile(fakeFile("hotels.csv"))).toMatch(/Chỉ chấp nhận/);
    expect(validateExcelFile(fakeFile("noextension"))).toMatch(/Chỉ chấp nhận/);
  });

  it("rejects files larger than 20MB", () => {
    expect(validateExcelFile(fakeFile("big.xlsx", 21 * 1024 * 1024))).toMatch(/quá lớn/);
  });

  it("accepts a file exactly at the 20MB limit", () => {
    expect(validateExcelFile(fakeFile("edge.xlsx", 20 * 1024 * 1024))).toBeNull();
  });
});

describe("buildParsedExcel", () => {
  const sheet = [
    ["No", "Hotel Name", "Hotel Address", "URL Type"],
    [1, "  Hotel Alpha  ", "  123 Main St ", " CTrip SuperAgg "],
    [2, "Hotel Beta", "456 Side Rd", ""],
  ];

  it("maps rows by detected columns and trims name/address/urlType", () => {
    const out = buildParsedExcel(sheet, "hotels.xlsx");
    expect(out.fileName).toBe("hotels.xlsx");
    expect(out.totalRows).toBe(2);
    expect(out.headers).toEqual(["No", "Hotel Name", "Hotel Address", "URL Type"]);
    expect(out.rows[0]).toMatchObject({
      no: "1",
      hotelName: "Hotel Alpha",
      address: "123 Main St",
      urlType: "CTrip SuperAgg",
    });
    // raw preserves the original row for later reference.
    expect(out.rows[0].raw).toEqual([1, "  Hotel Alpha  ", "  123 Main St ", " CTrip SuperAgg "]);
  });

  it("filters fully-empty rows before validating", () => {
    const withBlanks = [
      ["Hotel Name", "Address"],
      ["", "", ""],
      ["Hotel One", "Addr One"],
      [null, undefined, ""],
    ];
    const out = buildParsedExcel(withBlanks, "f.xlsx");
    expect(out.totalRows).toBe(1);
    expect(out.rows[0].hotelName).toBe("Hotel One");
  });

  it("leaves optional columns empty when not present", () => {
    const out = buildParsedExcel([["Hotel Name"], ["Solo Hotel"]], "f.xlsx");
    expect(out.rows[0]).toMatchObject({
      no: "",
      hotelName: "Solo Hotel",
      address: "",
      urlType: "",
    });
  });

  it("throws when there is no data row (header only)", () => {
    expect(() => buildParsedExcel([["Hotel Name"]], "f.xlsx")).toThrow(/ít nhất/);
  });

  it("throws when the sheet is empty", () => {
    expect(() => buildParsedExcel([], "f.xlsx")).toThrow(/ít nhất/);
  });

  it("throws when no Hotel Name column can be detected", () => {
    expect(() =>
      buildParsedExcel([["Foo", "Bar"], ["a", "b"]], "f.xlsx")
    ).toThrow(/Hotel Name/);
  });
});
