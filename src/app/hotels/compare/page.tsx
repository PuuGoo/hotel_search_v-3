"use client";

import { useState, useCallback, useEffect } from "react";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import dynamic from "next/dynamic";

import FeatureThemeProvider from "../../components/theme/FeatureThemeProvider";
import { useConfirm } from "../../components/ConfirmDialog";

const CompareTable = dynamic(() => import("./components/CompareTable"), { ssr: false });
const AddHotelModal = dynamic(() => import("./components/AddHotelModal"), { ssr: false });
const CompareExportButtons = dynamic(() => import("./components/CompareExportButtons"), { ssr: false });

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

const MAX_HOTELS = 4;
const LS_KEY = "compared-hotels";

function loadFromStorage(): HotelData[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Validate shape: all required fields must be present and correctly typed
    return parsed.filter(
      (h: any) =>
        h &&
        typeof h.id === "string" && h.id.length > 0 &&
        typeof h.name === "string" && h.name.length > 0 &&
        typeof h.url === "string" &&
        typeof h.description === "string" &&
        typeof h.rating === "number" && h.rating >= 0 && h.rating <= 5
    );
  } catch {
    return [];
  }
}

function saveToStorage(hotels: HotelData[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(hotels));
  } catch {
    // Storage full or unavailable - silently ignore
  }
}

const ComparePage = () => {
  const [hotels, setHotels] = useState<HotelData[]>(() => loadFromStorage());
  const [modalOpen, setModalOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const { confirm, DialogElement } = useConfirm();

  // Mark as hydrated after mount (data already loaded via lazy initializer)
  useEffect(() => {
    setHydrated(true);
  }, []);

  // Save to localStorage on every change (after hydration)
  useEffect(() => {
    if (hydrated) {
      saveToStorage(hotels);
    }
  }, [hotels, hydrated]);

  // Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && modalOpen) {
        setModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalOpen]);

  const handleAdd = useCallback((hotel: HotelData) => {
    setHotels((prev) => {
      if (prev.length >= MAX_HOTELS) return prev;
      if (prev.some((h) => h.id === hotel.id)) return prev;
      return [...prev, hotel];
    });
  }, []);

  const handleRemove = useCallback((id: string) => {
    setHotels((prev) => prev.filter((h) => h.id !== id));
  }, []);

  const handleClear = useCallback(() => {
    confirm({
      message: "Xóa tất cả khách sạn khỏi danh sách so sánh?",
      title: "Xóa tất cả",
      confirmLabel: "Xóa",
      variant: "danger",
    }).then((ok) => {
      if (ok) setHotels([]);
    });
  }, [confirm]);

  return (
    <FeatureThemeProvider feature="compare">
    <div className="h-full">
      {DialogElement}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-ink mb-2">
              So sánh khách sạn
            </h1>
            <p className="text-ink-soft">
              So sánh tối đa {MAX_HOTELS} khách sạn side-by-side
            </p>
          </div>
          <div className="flex items-center gap-3">
            {hotels.length > 0 && (
              <>
                <CompareExportButtons hotels={hotels} />
                <button
                  onClick={handleClear}
                  className="flex items-center gap-2 px-4 py-2.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors text-sm"
                >
                  <FiTrash2 className="w-4 h-4" />
                  Xóa tất cả
                </button>
              </>
            )}
            {hotels.length < MAX_HOTELS && (
              <button
                onClick={() => setModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors text-sm"
              >
                <FiPlus className="w-4 h-4" />
                Thêm khách sạn
              </button>
            )}
          </div>
        </div>

        {hotels.length === 0 ? (
          <div className="text-center py-16">
            <FiPlus className="mx-auto h-12 w-12 text-gray-600 mb-4" />
            <p className="text-lg text-ink-soft">
              Chưa có khách sạn để so sánh
            </p>
            <p className="text-sm text-ink-soft mt-2">
              Hãy tìm kiếm và thêm khách sạn
            </p>
            <button
              onClick={() => setModalOpen(true)}
              className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
            >
              <FiPlus className="w-4 h-4" />
              Thêm khách sạn đầu tiên
            </button>
          </div>
        ) : (
          <div className="bg-panel rounded-lg overflow-hidden">
            <CompareTable hotels={hotels} onRemove={handleRemove} />
          </div>
        )}

        <AddHotelModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onAdd={handleAdd}
          existingIds={hotels.map((h) => h.id)}
        />
      </div>
    </div>
    </FeatureThemeProvider>
  );
};

export default ComparePage;
