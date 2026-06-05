"use client";

import axios from "axios";
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { toast } from "react-hot-toast";
import { FiSearch, FiZap, FiFilter } from "react-icons/fi";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { SearchFilters as SearchFiltersType } from "./components/SearchFilters";
import type { EngineInfo } from "./components/EngineSelector";
import type { SearchResult, Search } from "./types";
import FeatureThemeProvider from "../components/theme/FeatureThemeProvider";
import { SearchHistoryProvider, useSearchHistory } from "./contexts/SearchHistoryContext";
import { PRICE_KEYWORDS, COUNTRY_KEYWORDS } from "../libs/filterKeywords";

const SearchFilters = dynamic(() => import("./components/SearchFilters"), { ssr: false });
const SearchSuggestions = dynamic(() => import("./components/SearchSuggestions"), { ssr: false });
const HistoryPanel = dynamic(() => import("./components/HistoryPanel"), { ssr: false });
const PriceAlertModal = dynamic(() => import("./components/PriceAlertModal"), { ssr: false });
const EngineSelector = dynamic(() => import("./components/EngineSelector"), { ssr: false });
const ResultCardSkeleton = dynamic(() => import("./components/ResultCardSkeleton"), { ssr: false });
const ResultCard = dynamic(() => import("./components/ResultCard"), { ssr: false });

// SearchResult, PerEngineStat, Search types imported from ./types

/** Deduplicate results by URL, keeping the one with the higher score and merging engine info */
function dedupResults(results: SearchResult[]): SearchResult[] {
  const urlMap = new Map<string, SearchResult>();
  for (const result of results) {
    const key = result.url || result.id;
    const existing = urlMap.get(key);
    if (!existing) {
      urlMap.set(key, result);
    } else {
      // Keep the result with the higher score
      const existingScore = existing.score ?? 0;
      const newScore = result.score ?? 0;
      if (newScore > existingScore) {
        urlMap.set(key, result);
      }
    }
  }
  return Array.from(urlMap.values());
}

const RESULTS_PER_PAGE = 20;

const HotelSearchContent = () => {
  const [query, setQuery] = useState("");
  const [selectedEngines, setSelectedEngines] = useState<string[]>(["tavily"]);
  const [sortBy, setSortBy] = useState<"score" | "az" | "za">("score");
  const [results, setResults] = useState<Search | null>(null);
  const [loading, setLoading] = useState(false);
  const [cacheHit, setCacheHit] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<SearchFiltersType>({
    minRating: 0,
    priceRange: "",
    country: "",
  });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [priceAlertHotel, setPriceAlertHotel] = useState<{ name: string; url?: string } | null>(null);
  const [showEnginesPanel, setShowEnginesPanel] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const filterBtnRef = useRef<HTMLButtonElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  // Track whether a mousedown occurred inside the suggestions area so
  // onBlur doesn't close the dropdown before the click event fires.
  const suggestionsInteractingRef = useRef(false);
  const [displayCount, setDisplayCount] = useState(RESULTS_PER_PAGE);
  const { refresh: refreshHistory } = useSearchHistory();
  const searchParams = useSearchParams();
  const router = useRouter();
  // Optimization: track stable results reference to avoid unnecessary filteredResults recalculations
  const resultsHashRef = useRef<string>("");
  const stableResultsRef = useRef<Search | null>(null);

  // Read URL params on mount and auto-search if q is present
  const didInitRef = useRef(false);
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    const urlQ = searchParams?.get("q");
    const urlEngines = searchParams?.get("engines");
    if (urlQ) {
      setQuery(urlQ);
      if (urlEngines) {
        const engines = urlEngines.split(",").filter(Boolean);
        if (engines.length > 0) setSelectedEngines(engines);
      }
      // Trigger auto-search via state flag so the form handler runs after
      // React has committed the state updates. The old approach (querySelector
      // + click + setTimeout) was fragile and could silently fail if the
      // button wasn't rendered yet.
      setAutoSearchReady(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [autoSearchReady, setAutoSearchReady] = useState(false);
  useEffect(() => {
    if (autoSearchReady) {
      setAutoSearchReady(false);
      // Fire after the current render cycle completes (state updates batched).
      handleSearchRef.current({ preventDefault: () => {} } as React.FormEvent);
    }
  }, [autoSearchReady]);

  // Listen for global shortcut events from ShortcutsProvider
  useEffect(() => {
    const handleFocusSearch = () => {
      inputRef.current?.focus();
    };
    const handleCloseModal = () => {
      setFiltersOpen(false);
      setShowSuggestions(false);
      setShowEnginesPanel(false);
      setPriceAlertHotel(null);
    };
    window.addEventListener("focus-search", handleFocusSearch);
    window.addEventListener("close-modal", handleCloseModal);
    return () => {
      window.removeEventListener("focus-search", handleFocusSearch);
      window.removeEventListener("close-modal", handleCloseModal);
    };
  }, []);

  // Escape key to close all panels when not in an input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setFiltersOpen(false);
        setShowSuggestions(false);
        setShowEnginesPanel(false);
        setPriceAlertHotel(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const availableEngines: EngineInfo[] = [
    { id: "tavily", name: "Tavily", available: true, description: "Tìm kiếm AI-powered với kết quả chất lượng cao" },
    { id: "google", name: "Google", available: true, description: "Tìm kiếm Google Custom Search" },
    { id: "ddg", name: "DuckDuckGo", available: true, description: "Tìm kiếm riêng tư không theo dõi" },
    { id: "bing", name: "Bing", available: true, description: "Microsoft Bing Web Search API" },
    { id: "yahoo", name: "Yahoo", available: true, description: "Tìm kiếm qua Yahoo (scraping)" },
  ];

  // Optimization: compute a lightweight hash of results content
  // Only update stableResultsRef when content actually changes (avoids re-filtering on referential changes)
  const resultsHash = results
    ? `${results.id}-${results.resultCount}-${results.results.length}-${results.results[0]?.id || ""}-${results.results[results.results.length - 1]?.id || ""}`
    : "";
  if (resultsHash !== resultsHashRef.current) {
    resultsHashRef.current = resultsHash;
    stableResultsRef.current = results;
  }

  const filteredResults = useMemo(() => {
    const stableResults = stableResultsRef.current;
    if (!stableResults) return null;

    const hasActiveFilters =
      filters.minRating > 0 ||
      filters.priceRange !== "" ||
      filters.country !== "";

    if (!hasActiveFilters && sortBy === "score") return stableResults;

    const filtered = stableResults.results.filter((result) => {
      const snippet = (result.snippet || "").toLowerCase();
      const title = (result.title || "").toLowerCase();
      const combined = `${title} ${snippet}`;

      if (filters.minRating > 0 && typeof result.score === "number") {
        const scorePercent = Math.round(result.score * 100);
        if (scorePercent < filters.minRating) return false;
      }

      if (filters.priceRange) {
        const keywords = PRICE_KEYWORDS[filters.priceRange] || [];
        const matchesPrice = keywords.some((kw) => combined.includes(kw.toLowerCase()));
        if (!matchesPrice) return false;
      }

      if (filters.country) {
        const keywords = COUNTRY_KEYWORDS[filters.country] || [];
        const matchesCountry = keywords.some((kw) => combined.includes(kw.toLowerCase()));
        if (!matchesCountry) return false;
      }

      return true;
    });

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "az") {
        return (a.title || "").localeCompare(b.title || "");
      }
      if (sortBy === "za") {
        return (b.title || "").localeCompare(a.title || "");
      }
      // score desc (default)
      return (b.score ?? 0) - (a.score ?? 0);
    });

    return {
      ...stableResults,
      results: sorted,
      resultCount: sorted.length,
    };
  }, [resultsHash, filters, sortBy]);

  const handleSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!query.trim()) {
      toast.error("Vui lòng nhập từ khóa tìm kiếm");
      return;
    }

    if (selectedEngines.length === 0) {
      toast.error("Vui lòng chọn ít nhất một nguồn tìm kiếm");
      return;
    }

    // Persist search state to URL
    const params = new URLSearchParams();
    params.set("q", query.trim());
    params.set("engines", selectedEngines.join(","));
    router.replace(`/hotels?${params.toString()}`);

    // Cancel any in-flight search to prevent stale responses overwriting fresh ones
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setCacheHit(false);
    setDisplayCount(RESULTS_PER_PAGE);
    try {
      const response = await axios.post("/api/search", {
        query: query.trim(),
        engines: selectedEngines,
      }, { signal: controller.signal });

      // Deduplicate results by URL when multiple engines are used
      const data = response.data as Search;
      if (selectedEngines.length > 1 && data.results) {
        const dedupedResults = dedupResults(data.results);
        data.results = dedupedResults;
        data.resultCount = dedupedResults.length;
      }

      setResults(data);

      // Check if result came from cache
      const isCache = response.headers["x-cache"] === "HIT";
      setCacheHit(isCache);

      axios.post("/api/search/history", {
        query: query.trim(),
        engine: selectedEngines.join(","),
      }).catch(() => {});

      // Refresh shared history so SearchSuggestions and HistoryPanel update
      refreshHistory();

      toast.success(
        `Tìm thấy ${data.resultCount} kết quả${isCache ? " (từ cache)" : ""}`
      );
    } catch (error: any) {
      // Ignore aborted requests — the user started a new search
      if (axios.isCancel(error)) return;

      console.error("Search error:", error);
      // Clear stale results so the user doesn't see outdated data
      setResults(null);

      if (error.response?.status === 429) {
        const retryAfter = error.response.data?.retryAfterMs;
        const seconds = retryAfter ? Math.ceil(retryAfter / 1000) : 60;
        toast.error(`Quá nhiều yêu cầu. Vui lòng chờ ${seconds} giây.`);
      } else if (error.response?.status === 503) {
        toast.error("Dịch vụ tạm thời không khả dụng. Vui lòng thử lại sau.");
      } else {
        toast.error(error.response?.data?.error || "Có lỗi xảy ra khi tìm kiếm");
      }
    } finally {
      // Only clear loading if this is still the active request
      if (abortControllerRef.current === controller) {
        setLoading(false);
      }
    }
  }, [query, selectedEngines, router, refreshHistory]);

  // Ref to always call the latest handleSearch from effects,
  // avoiding stale closures while keeping effect deps minimal.
  const handleSearchRef = useRef(handleSearch);
  handleSearchRef.current = handleSearch;

  const handleSelectSuggestion = useCallback(
    (selectedQuery: string) => {
      setQuery(selectedQuery);
      setShowSuggestions(false);
    },
    []
  );

  const handleBookmark = useCallback(async (result: SearchResult) => {
    if (!result.url) {
      toast.error("Kết quả này không có URL để lưu");
      return;
    }
    try {
      await axios.post("/api/bookmarks", {
        title: result.title,
        url: result.url,
        notes: result.snippet,
        folder: "hotel-search",
      });
      toast.success("Đã lưu bookmark");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Không thể lưu bookmark");
    }
  }, []);

  const [comparedUrls, setComparedUrls] = useState<Set<string>>(new Set());

  // Keep comparedUrls in sync with localStorage
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("compared-hotels") || "[]");
      if (Array.isArray(stored)) {
        setComparedUrls(new Set(stored.map((h: any) => h.url).filter(Boolean)));
      }
    } catch {
      // ignore
    }
  }, []);

  const handleAddToCompare = useCallback((result: SearchResult) => {
    if (!result.url) {
      toast.error("Kết quả này không có URL để lưu");
      return;
    }
    try {
      const stored = JSON.parse(localStorage.getItem("compared-hotels") || "[]");
      const exists = stored.some((h: any) => h.url === result.url);
      if (exists) {
        toast("Đã có trong danh sách so sánh", { icon: "ℹ️" });
        return;
      }
      stored.push({
        id: result.url,
        name: result.title || "Không có tiêu đề",
        address: "",
        rating: result.score != null ? Math.min(5, Math.max(1, Math.round(result.score * 5))) : 3,
        priceRange: "",
        description: result.snippet || "",
        url: result.url,
        images: [],
      });
      localStorage.setItem("compared-hotels", JSON.stringify(stored));
      setComparedUrls((prev) => new Set(prev).add(result.url!));
      toast.success("Đã thêm vào danh sách so sánh");
    } catch {
      toast.error("Không thể thêm vào so sánh");
    }
  }, []);

  const isCompared = useCallback(
    (url: string | null) => (url ? comparedUrls.has(url) : false),
    [comparedUrls]
  );

  return (
    <FeatureThemeProvider feature="search">
      <main className="h-full bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Tìm kiếm khách sạn
          </h1>
          <p className="text-gray-400">
            Tìm kiếm thông tin khách sạn với nhiều nguồn khác nhau
          </p>
        </header>

        {/* Search Form */}
        <section aria-label="Tìm kiếm">
        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => {
                  // Delay closing so that mousedown→click on a suggestion
                  // can fire first. The SearchSuggestions component sets
                  // suggestionsInteractingRef via onMouseDown.
                  setTimeout(() => {
                    if (!suggestionsInteractingRef.current) {
                      setShowSuggestions(false);
                    }
                    suggestionsInteractingRef.current = false;
                  }, 150);
                }}
                placeholder="Nhập tên khách sạn hoặc địa điểm..."
                className="w-full pl-12 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                disabled={loading}
                maxLength={500}
                aria-label="Tìm kiếm khách sạn"
                role="combobox"
                aria-expanded={showSuggestions}
                aria-haspopup="listbox"
                aria-autocomplete="list"
                aria-controls="search-suggestions-listbox"
              />
              <SearchSuggestions
                query={query}
                onSelect={handleSelectSuggestion}
                isVisible={showSuggestions}
                onClose={() => setShowSuggestions(false)}
                inputRef={inputRef}
                onInteractionStart={() => { suggestionsInteractingRef.current = true; }}
              />
            </div>
            <button
              ref={filterBtnRef}
              type="button"
              onClick={() => setFiltersOpen(true)}
              className={`flex items-center justify-center gap-2 px-4 py-3 border rounded-lg transition-colors ${
                filters.minRating > 0 || filters.priceRange || filters.country
                  ? "bg-sky-500/20 border-sky-500 text-sky-400"
                  : "bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:border-gray-600"
              }`}
              aria-label="Bộ lọc tìm kiếm"
            >
              <FiFilter className="w-4 h-4" />
              <span className="hidden sm:inline">Bộ lọc</span>
            </button>
            <button
              type="button"
              onClick={() => setShowEnginesPanel(!showEnginesPanel)}
              className={`flex items-center justify-center gap-2 px-4 py-3 border rounded-lg transition-colors ${
                selectedEngines.length > 1
                  ? "bg-sky-500/20 border-sky-500 text-sky-400"
                  : "bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:border-gray-600"
              }`}
              aria-label="Chọn nguồn tìm kiếm"
            >
              <FiZap className="w-4 h-4" />
              <span className="hidden sm:inline">
                {selectedEngines.length} nguồn
              </span>
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-sky-500 text-white rounded-lg hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Đang tìm...
                </span>
              ) : (
                "Tìm kiếm"
              )}
            </button>
          </div>
        </form>
        </section>

        <div
          className={`mb-6 overflow-hidden transition-all duration-300 ease-in-out ${
            showEnginesPanel ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
            <EngineSelector
              selected={selectedEngines}
              onChange={setSelectedEngines}
              available={availableEngines}
            />
          </div>
        </div>

        <HistoryPanel onSelect={handleSelectSuggestion} />

        <div className="flex gap-6">
          <SearchFilters
            onFilterChange={setFilters}
            isOpen={filtersOpen}
            onClose={() => {
              setFiltersOpen(false);
              // Restore focus to the filter button (WCAG focus management)
              requestAnimationFrame(() => filterBtnRef.current?.focus());
            }}
            currentFilters={filters}
          />

          <section className="flex-1 min-w-0" aria-label="Kết quả tìm kiếm">
        {/* Results */}
        {loading && !filteredResults && (
          <div className="space-y-4" aria-live="polite" role="status">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm text-gray-400 animate-pulse">Đang tìm kiếm...</span>
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
              <ResultCardSkeleton key={i} />
            ))}
          </div>
        )}
        {filteredResults && (
          <div className="space-y-4" aria-live="polite" aria-atomic="false">
            <div className="flex items-center justify-between flex-wrap gap-2 text-sm text-gray-400 mb-4">
              <span className="flex items-center gap-2" role="status">
                Tìm thấy {filteredResults.resultCount} kết quả trong{" "}
                {filteredResults.duration ? `${filteredResults.duration}ms` : "..."}
                {cacheHit && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-900/50 text-green-400 rounded text-xs">
                    <FiZap className="w-3 h-3" />
                    Cache
                  </span>
                )}
                {(filters.minRating > 0 || filters.priceRange || filters.country) && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-sky-900/50 text-sky-400 rounded text-xs">
                    <FiFilter className="w-3 h-3" />
                    Đã lọc
                  </span>
                )}
              </span>
              <div className="flex items-center gap-3">
                <label className="sr-only" htmlFor="sort-select">Sắp xếp kết quả</label>
                <select
                  id="sort-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as "score" | "az" | "za")}
                  className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded px-2 py-1 focus:outline-none focus:border-sky-500"
                >
                  <option value="score">Điểm cao nhất</option>
                  <option value="az">A → Z</option>
                  <option value="za">Z → A</option>
                </select>
                <span aria-label={`Nguồn: ${(filteredResults.engines || [filteredResults.engine]).join(", ").toUpperCase()}`}>
                Nguồn: {(filteredResults.engines || [filteredResults.engine]).join(", ").toUpperCase()}
                </span>
              </div>
            </div>

            {filteredResults.perEngineStats && filteredResults.perEngineStats.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {filteredResults.perEngineStats.map((stat) => (
                  <div
                    key={stat.engine}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs ${
                      stat.error
                        ? "bg-red-900/30 text-red-400 border border-red-800/50"
                        : "bg-gray-800 text-gray-300 border border-gray-700"
                    }`}
                  >
                    <span className="font-medium">{stat.engine.toUpperCase()}</span>
                    <span className="text-gray-500">|</span>
                    <span>{stat.resultCount} kết quả</span>
                    <span className="text-gray-500">|</span>
                    <span>{stat.duration}ms</span>
                    {stat.cached && (
                      <FiZap className="w-3 h-3 text-green-400" />
                    )}
                    {stat.error && (
                      <span className="text-red-400" title={stat.error}>!</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {filteredResults.results.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                Không tìm thấy kết quả nào phù hợp với bộ lọc
              </div>
            ) : (
              <>
                {filteredResults.results.slice(0, displayCount).map((result, index) => (
                <ResultCard
                  key={result.id}
                  result={result}
                  onBookmark={handleBookmark}
                  onAlert={setPriceAlertHotel}
                  onCompare={handleAddToCompare}
                  isCompared={isCompared(result.url)}
                  index={index}
                />
                ))}
                {displayCount < filteredResults.results.length && (
                  <div className="text-center pt-4">
                    <button
                      type="button"
                      onClick={() => setDisplayCount((prev) => prev + RESULTS_PER_PAGE)}
                      className="px-6 py-2.5 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 hover:text-white transition-colors text-sm"
                    >
                      Xem thêm ({filteredResults.results.length - displayCount} kết quả)
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Empty State */}
        {!results && !loading && (
          <div className="text-center py-16 text-gray-400">
            <FiSearch className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg">Nhập từ khóa để bắt đầu tìm kiếm</p>
            <p className="text-sm mt-2">
              Hỗ trợ tìm kiếm khách sạn, địa điểm, và nhiều hơn nữa
            </p>
            <p className="text-xs mt-4 text-gray-500">
              Multi-key rotation • Circuit breaker • LRU Cache • Rate limiting
            </p>
          </div>
        )}
          </section>
        </div>
      </div>

      <PriceAlertModal
        hotelName={priceAlertHotel?.name || ""}
        hotelUrl={priceAlertHotel?.url}
        isOpen={!!priceAlertHotel}
        onClose={() => setPriceAlertHotel(null)}
      />
      </main>
    </FeatureThemeProvider>
  );
};

export default function HotelSearchPage() {
  return (
    <SearchHistoryProvider>
      <HotelSearchContent />
    </SearchHistoryProvider>
  );
}
