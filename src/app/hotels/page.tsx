"use client";

import axios from "axios";
import { useState, useMemo, useCallback } from "react";
import { toast } from "react-hot-toast";
import { FiSearch, FiBookmark, FiExternalLink, FiStar, FiZap, FiFilter, FiBell } from "react-icons/fi";
import dynamic from "next/dynamic";
import type { SearchFilters as SearchFiltersType } from "./components/SearchFilters";
import type { EngineInfo } from "./components/EngineSelector";
import FeatureThemeProvider from "../components/theme/FeatureThemeProvider";

const SearchFilters = dynamic(() => import("./components/SearchFilters"), { ssr: false });
const SearchSuggestions = dynamic(() => import("./components/SearchSuggestions"), { ssr: false });
const HistoryPanel = dynamic(() => import("./components/HistoryPanel"), { ssr: false });
const PriceAlertModal = dynamic(() => import("./components/PriceAlertModal"), { ssr: false });
const EngineSelector = dynamic(() => import("./components/EngineSelector"), { ssr: false });

interface SearchResult {
  id: string;
  title: string | null;
  url: string | null;
  snippet: string | null;
  position: number | null;
  score: number | null;
}

interface PerEngineStat {
  engine: string;
  resultCount: number;
  duration: number;
  cached: boolean;
  error: string | null;
}

interface Search {
  id: string;
  query: string;
  engine: string;
  engines?: string[];
  resultCount: number;
  duration: number | null;
  perEngineStats?: PerEngineStat[];
  results: SearchResult[];
}

const HotelSearchPage = () => {
  const [query, setQuery] = useState("");
  const [selectedEngines, setSelectedEngines] = useState<string[]>(["tavily"]);
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

  const availableEngines: EngineInfo[] = [
    { id: "tavily", name: "Tavily", available: true, description: "Tìm kiếm AI-powered với kết quả chất lượng cao" },
    { id: "google", name: "Google", available: true, description: "Tìm kiếm Google Custom Search" },
    { id: "ddg", name: "DuckDuckGo", available: true, description: "Tìm kiếm riêng tư không theo dõi" },
    { id: "bing", name: "Bing", available: !!process.env.NEXT_PUBLIC_BING_AVAILABLE, description: "Microsoft Bing Web Search API" },
    { id: "yahoo", name: "Yahoo", available: true, description: "Tìm kiếm qua Yahoo (scraping)" },
  ];

  const filteredResults = useMemo(() => {
    if (!results) return null;

    const hasActiveFilters =
      filters.minRating > 0 ||
      filters.priceRange !== "" ||
      filters.country !== "";

    if (!hasActiveFilters) return results;

    const filtered = results.results.filter((result) => {
      const snippet = (result.snippet || "").toLowerCase();
      const title = (result.title || "").toLowerCase();
      const combined = `${title} ${snippet}`;

      if (filters.minRating > 0 && typeof result.score === "number") {
        const mappedRating = Math.min(5, Math.max(1, Math.round(result.score * 5)));
        if (mappedRating < filters.minRating) return false;
      }

      if (filters.priceRange) {
        const priceKeywords: Record<string, string[]> = {
          budget: ["rẻ", "giá rẻ", "budget", "cheap", "affordable", "tiết kiệm", "$"],
          mid: ["trung bình", "mid-range", "moderate", "$$", "3 sao", "4 sao"],
          luxury: ["cao cấp", "luxury", "5 sao", "resort", "premium", "$$$", "biệt thự"],
        };
        const keywords = priceKeywords[filters.priceRange] || [];
        const matchesPrice = keywords.some((kw) => combined.includes(kw.toLowerCase()));
        if (!matchesPrice) return false;
      }

      if (filters.country) {
        const countryKeywords: Record<string, string[]> = {
          Vietnam: ["việt nam", "vietnam", "vietnamese", "sài gòn", "hà nội", "đà nẵng", "nha trang", "phú quốc", "hội an"],
          Thailand: ["thái lan", "thailand", "thai", "bangkok", "phuket", "chiang mai", "pattaya"],
          Japan: ["nhật bản", "japan", "japanese", "tokyo", "osaka", "kyoto", "hokkaido"],
          "South Korea": ["hàn quốc", "korea", "korean", "seoul", "busan", "jeju"],
          Singapore: ["singapore", "singaporean"],
          Malaysia: ["malaysia", "malaysian", "kuala lumpur", "penang"],
          Indonesia: ["indonesia", "indonesian", "bali", "jakarta"],
          Philippines: ["philippines", "philippine", "manila", "cebu", "boracay"],
          Cambodia: ["campuchia", "cambodia", "cambodian", "siem reap", "phnom penh"],
          France: ["pháp", "france", "french", "paris", "nice", "lyon"],
          "United States": ["mỹ", "usa", "us", "united states", "american", "new york", "los angeles", "las vegas", "miami", "hawaii"],
          "United Kingdom": ["anh", "uk", "united kingdom", "british", "london", "manchester", "edinburgh"],
          Australia: ["úc", "australia", "australian", "sydney", "melbourne"],
        };
        const keywords = countryKeywords[filters.country] || [];
        const matchesCountry = keywords.some((kw) => combined.includes(kw.toLowerCase()));
        if (!matchesCountry) return false;
      }

      return true;
    });

    return {
      ...results,
      results: filtered,
      resultCount: filtered.length,
    };
  }, [results, filters]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!query.trim()) {
      toast.error("Vui lòng nhập từ khóa tìm kiếm");
      return;
    }

    if (selectedEngines.length === 0) {
      toast.error("Vui lòng chọn ít nhất một nguồn tìm kiếm");
      return;
    }

    setLoading(true);
    setCacheHit(false);
    try {
      const response = await axios.post("/api/search", {
        query: query.trim(),
        engines: selectedEngines,
      });
      setResults(response.data);

      // Check if result came from cache
      const isCache = response.headers["x-cache"] === "HIT";
      setCacheHit(isCache);

      axios.post("/api/search/history", {
        query: query.trim(),
        engine: selectedEngines.join(","),
      }).catch(() => {});

      toast.success(
        `Tìm thấy ${response.data.resultCount} kết quả${isCache ? " (từ cache)" : ""}`
      );
    } catch (error: any) {
      console.error("Search error:", error);

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
      setLoading(false);
    }
  };

  const handleSelectSuggestion = useCallback(
    (selectedQuery: string) => {
      setQuery(selectedQuery);
      setShowSuggestions(false);
    },
    []
  );

  const handleBookmark = async (result: SearchResult) => {
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
  };

  return (
    <FeatureThemeProvider feature="search">
      <div className="h-full bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Tìm kiếm khách sạn
          </h1>
          <p className="text-gray-400">
            Tìm kiếm thông tin khách sạn với nhiều nguồn khác nhau
          </p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="Nhập tên khách sạn hoặc địa điểm..."
                className="w-full pl-12 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                disabled={loading}
                maxLength={500}
              />
              <SearchSuggestions
                query={query}
                onSelect={handleSelectSuggestion}
                isVisible={showSuggestions}
                onClose={() => setShowSuggestions(false)}
              />
            </div>
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className={`flex items-center justify-center gap-2 px-4 py-3 border rounded-lg transition-colors ${
                filters.minRating > 0 || filters.priceRange || filters.country
                  ? "bg-sky-500/20 border-sky-500 text-sky-400"
                  : "bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:border-gray-600"
              }`}
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

        {showEnginesPanel && (
          <div className="mb-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
            <EngineSelector
              selected={selectedEngines}
              onChange={setSelectedEngines}
              available={availableEngines}
            />
          </div>
        )}

        <HistoryPanel onSelect={handleSelectSuggestion} />

        <div className="flex gap-6">
          <SearchFilters
            onFilterChange={setFilters}
            isOpen={filtersOpen}
            onClose={() => setFiltersOpen(false)}
          />

          <div className="flex-1 min-w-0">
        {/* Results */}
        {filteredResults && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm text-gray-400 mb-4">
              <span className="flex items-center gap-2">
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
              <span>
                Nguồn: {(filteredResults.engines || [filteredResults.engine]).join(", ").toUpperCase()}
              </span>
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
              filteredResults.results.map((result) => (
                <div
                  key={result.id}
                  className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-sky-400 mb-1 truncate">
                        {result.url ? (
                          <a
                            href={result.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                          >
                            {result.title || "Không có tiêu đề"}
                          </a>
                        ) : (
                          result.title || "Không có tiêu đề"
                        )}
                      </h3>
                      {result.url && (
                        <p className="text-sm text-green-400 truncate mb-2">
                          {result.url}
                        </p>
                      )}
                      <p className="text-gray-300 text-sm line-clamp-2">
                        {result.snippet || "Không có mô tả"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          setPriceAlertHotel({
                            name: result.title || "Không có tiêu đề",
                            url: result.url || undefined,
                          })
                        }
                        className="p-2 text-gray-400 hover:text-sky-400 transition-colors"
                        title="Theo dõi giá"
                      >
                        <FiBell />
                      </button>
                      <button
                        onClick={() => handleBookmark(result)}
                        disabled={!result.url}
                        className="p-2 text-gray-400 hover:text-yellow-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-gray-400"
                        title={result.url ? "Lưu bookmark" : "Không có URL để lưu"}
                      >
                        <FiBookmark />
                      </button>
                      {result.url && (
                        <a
                          href={result.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-gray-400 hover:text-sky-400 transition-colors"
                          title="Mở link"
                        >
                          <FiExternalLink />
                        </a>
                      )}
                    </div>
                  </div>
                  {typeof result.score === "number" && (
                    <div className="mt-3 flex items-center gap-2">
                      <FiStar className="text-yellow-400" />
                      <span className="text-sm text-gray-400">
                        Điểm: {(result.score * 100).toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
              ))
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
          </div>
        </div>
      </div>

      <PriceAlertModal
        hotelName={priceAlertHotel?.name || ""}
        hotelUrl={priceAlertHotel?.url}
        isOpen={!!priceAlertHotel}
        onClose={() => setPriceAlertHotel(null)}
      />
      </div>
    </FeatureThemeProvider>
  );
};

export default HotelSearchPage;
