"use client";

import axios from "axios";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { FiSearch, FiBookmark, FiExternalLink, FiStar } from "react-icons/fi";

interface SearchResult {
  id: string;
  title: string | null;
  url: string | null;
  snippet: string | null;
  position: number | null;
  score: number | null;
}

interface Search {
  id: string;
  query: string;
  engine: string;
  resultCount: number;
  duration: number | null;
  results: SearchResult[];
}

const HotelSearchPage = () => {
  const [query, setQuery] = useState("");
  const [engine, setEngine] = useState("tavily");
  const [results, setResults] = useState<Search | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!query.trim()) {
      toast.error("Vui lòng nhập từ khóa tìm kiếm");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post("/api/search", {
        query: query.trim(),
        engine,
      });
      setResults(response.data);
      toast.success(`Tìm thấy ${response.data.resultCount} kết quả`);
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Có lỗi xảy ra khi tìm kiếm");
    } finally {
      setLoading(false);
    }
  };

  const handleBookmark = async (result: SearchResult) => {
    try {
      await axios.post("/api/bookmarks", {
        title: result.title,
        url: result.url,
        notes: result.snippet,
        folder: "hotel-search",
      });
      toast.success("Đã lưu bookmark");
    } catch (error) {
      toast.error("Không thể lưu bookmark");
    }
  };

  return (
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
                placeholder="Nhập tên khách sạn hoặc địa điểm..."
                className="w-full pl-12 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                disabled={loading}
              />
            </div>
            <select
              value={engine}
              onChange={(e) => setEngine(e.target.value)}
              className="px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-sky-500"
              disabled={loading}
            >
              <option value="tavily">Tavily</option>
              <option value="google">Google</option>
              <option value="ddg">DuckDuckGo</option>
            </select>
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

        {/* Results */}
        {results && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm text-gray-400 mb-4">
              <span>
                Tìm thấy {results.resultCount} kết quả trong{" "}
                {results.duration ? `${results.duration}ms` : "..."}
              </span>
              <span>Engine: {results.engine.toUpperCase()}</span>
            </div>

            {results.results.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                Không tìm thấy kết quả nào
              </div>
            ) : (
              results.results.map((result) => (
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
                            {result.title || "Untitled"}
                          </a>
                        ) : (
                          result.title || "Untitled"
                        )}
                      </h3>
                      {result.url && (
                        <p className="text-sm text-green-400 truncate mb-2">
                          {result.url}
                        </p>
                      )}
                      <p className="text-gray-300 text-sm line-clamp-2">
                        {result.snippet || "No description available"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleBookmark(result)}
                        className="p-2 text-gray-400 hover:text-yellow-400 transition-colors"
                        title="Lưu bookmark"
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
                  {result.score && (
                    <div className="mt-3 flex items-center gap-2">
                      <FiStar className="text-yellow-400" />
                      <span className="text-sm text-gray-400">
                        Score: {(result.score * 100).toFixed(1)}%
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
          </div>
        )}
      </div>
    </div>
  );
};

export default HotelSearchPage;
