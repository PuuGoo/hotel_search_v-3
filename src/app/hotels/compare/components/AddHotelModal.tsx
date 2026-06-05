"use client";

import { Fragment, useState, useCallback, useRef, useEffect } from "react";
import { FiPlus, FiSearch, FiStar, FiLoader } from "react-icons/fi";
import { Dialog, Transition } from "@headlessui/react";
import { IoClose } from "react-icons/io5";
import { safeHref } from "../../../libs/safeUrl";

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

interface SearchResult {
  id?: string;
  title?: string | null;
  url?: string | null;
  snippet?: string | null;
  score?: number | null;
}

interface AddHotelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (hotel: HotelData) => void;
  existingIds: string[];
}

function mapResultToHotel(r: SearchResult, index: number): HotelData {
  const name = r.title || "Unknown Hotel";
  const rating = r.score != null ? Math.min(5, Math.max(1, Math.round(r.score * 5))) : 3;
  return {
    id: r.url || r.id || `search-${index}`,
    name,
    address: "",
    rating,
    priceRange: "",
    description: r.snippet || "",
    url: r.url || "",
    images: [],
  };
}

const AddHotelModal: React.FC<AddHotelModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  existingIds,
}) => {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<HotelData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      setSearched(false);
      setError(null);
      return;
    }

    // Cancel any in-flight request
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: `hotel ${query}`, engine: "tavily" }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Search failed (${res.status})`);
      }

      const data = await res.json();
      const mapped = (data.results || []).map((r: SearchResult, i: number) =>
        mapResultToHotel(r, i)
      );
      setResults(mapped);
      setSearched(true);
    } catch (err: any) {
      if (err.name === "AbortError") return;
      setError(err.message || "Search failed");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search on input change
  useEffect(() => {
    if (!isOpen) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!search.trim()) {
      setResults([]);
      setSearched(false);
      setError(null);
      return;
    }

    debounceRef.current = setTimeout(() => {
      performSearch(search);
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, isOpen, performSearch]);

  // Cleanup on close
  useEffect(() => {
    if (!isOpen) {
      setSearch("");
      setResults([]);
      setSearched(false);
      setError(null);
      if (abortRef.current) abortRef.current.abort();
    }
  }, [isOpen]);

  const filtered = results.filter((h) => !existingIds.includes(h.id));

  const handleAdd = (hotel: HotelData) => {
    onAdd(hotel);
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-gray-800 px-4 pb-4 pt-5 text-left shadow-xl transition-all w-full sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block z-10">
                  <button
                    type="button"
                    className="rounded-md bg-gray-800 text-gray-400 hover:text-gray-300 focus:outline-none"
                    onClick={onClose}
                  >
                    <span className="sr-only">Đóng</span>
                    <IoClose className="h-6 w-6" />
                  </button>
                </div>

                <Dialog.Title className="text-lg font-semibold text-white mb-4">
                  Tìm kiếm khách sạn
                </Dialog.Title>

                <div className="relative mb-4">
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Nhập tên khách sạn, địa điểm..."
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-sky-500 text-sm"
                    autoFocus
                  />
                  {loading && (
                    <FiLoader className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 animate-spin" />
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto space-y-2">
                  {error ? (
                    <div className="text-center py-6">
                      <p className="text-red-400 text-sm">{error}</p>
                      <button
                        onClick={() => performSearch(search)}
                        className="mt-2 text-sky-400 text-sm hover:underline"
                      >
                        Thử lại
                      </button>
                    </div>
                  ) : loading ? (
                    <p className="text-center text-gray-400 py-6 text-sm">
                      Đang tìm kiếm...
                    </p>
                  ) : !searched ? (
                    <p className="text-center text-gray-400 py-6 text-sm">
                      Nhập từ khóa để tìm kiếm khách sạn
                    </p>
                  ) : filtered.length === 0 ? (
                    <p className="text-center text-gray-400 py-6 text-sm">
                      {search
                        ? "Không tìm thấy khách sạn phù hợp"
                        : "Nhập từ khóa để tìm kiếm"}
                    </p>
                  ) : (
                    filtered.map((hotel) => (
                      <div
                        key={hotel.id}
                        className="flex items-center justify-between p-3 bg-gray-700 rounded-lg hover:bg-gray-650 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {hotel.name}
                          </p>
                          {hotel.description && (
                            <p className="text-xs text-gray-400 line-clamp-2 mt-1">
                              {hotel.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex items-center gap-0.5">
                              {Array.from({ length: hotel.rating }).map((_, i) => (
                                <FiStar
                                  key={i}
                                  className="w-3 h-3 text-yellow-400 fill-yellow-400"
                                />
                              ))}
                            </div>
                            {safeHref(hotel.url) && (
                              <span className="text-xs text-sky-400 truncate max-w-[180px]">
                                {(() => {
                                  try { return new URL(hotel.url).hostname; }
                                  catch { return hotel.url; }
                                })()}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleAdd(hotel)}
                          className="ml-3 p-2 text-sky-400 hover:bg-sky-500/20 rounded-lg transition-colors flex-shrink-0"
                          title="Thêm vào so sánh"
                        >
                          <FiPlus className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

export default AddHotelModal;
