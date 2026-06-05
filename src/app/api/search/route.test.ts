import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks (must be declared before importing the module under test) ──────────

// Prisma – only the methods the route touches
vi.mock("@/app/libs/prismadb", () => ({
  default: {
    searchHistory: { create: vi.fn().mockResolvedValue({}) },
    search: { create: vi.fn().mockResolvedValue({}), findMany: vi.fn(), count: vi.fn() },
  },
}));

// getCurrentUser – returns a user or null depending on the test
vi.mock("@/app/actions/getCurrentUser", () => ({
  default: vi.fn(),
}));

// Rate limiter – always allow by default
vi.mock("@/app/libs/rateLimit", () => ({
  checkRateLimit: vi.fn(() => ({
    allowed: true,
    remaining: 99,
    limit: 100,
    resetInMs: 60_000,
  })),
}));

// Search engines – return a deterministic result
vi.mock("@/app/libs/searchEngines", () => ({
  runEngineSearch: vi.fn().mockResolvedValue({
    results: [
      { title: "Hotel ABC", url: "https://example.com/abc", snippet: "A great hotel", score: 0.9 },
    ],
    cached: false,
  }),
  NormalizedSearchResult: {},
}));

// Service error classification
vi.mock("@/app/libs/serviceErrors", () => ({
  isServiceUnavailable: vi.fn().mockReturnValue(false),
}));

// Feature flags – allow everything by default
vi.mock("@/app/libs/features", () => ({
  hasFeature: vi.fn().mockReturnValue(true),
}));

// Filter keywords
vi.mock("@/app/libs/filterKeywords", () => ({
  PRICE_KEYWORDS: {},
  COUNTRY_KEYWORDS: {},
}));

// ── Imports under test ───────────────────────────────────────────────────────

import { POST, GET } from "./route";
import getCurrentUser from "@/app/actions/getCurrentUser";

// Helper to build a minimal Next.js-like Request
function makePostRequest(body: unknown): Request {
  return new Request("http://localhost/api/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeGetRequest(url = "http://localhost/api/search?page=1&limit=10"): Request {
  return new Request(url, { method: "GET" });
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: anonymous (no session)
    vi.mocked(getCurrentUser).mockResolvedValue(null);
  });

  it("returns 400 when query is missing", async () => {
    const res = await POST(makePostRequest({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("returns 400 when query is empty string", async () => {
    const res = await POST(makePostRequest({ query: "" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when JSON body is malformed", async () => {
    const req = new Request("http://localhost/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json{{{",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Invalid JSON");
  });

  it("returns search results for a valid query (anonymous)", async () => {
    const res = await POST(makePostRequest({ query: "Hotel Saigon" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results).toBeDefined();
    expect(body.results.length).toBeGreaterThanOrEqual(1);
    expect(body.results[0].title).toBe("Hotel ABC");
    expect(body.query).toBe("Hotel Saigon");
    expect(body.engine).toBeDefined();
  });

  it("returns search results for a valid query (authenticated user)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: "user-1",
      role: "USER",
      permissions: ["search"],
    } as Awaited<ReturnType<typeof getCurrentUser>>);

    const res = await POST(makePostRequest({ query: "Beach resort" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results).toBeDefined();
    expect(body.query).toBe("Beach resort");
  });
});

describe("GET /api/search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without a session", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain("Unauthorized");
  });
});
