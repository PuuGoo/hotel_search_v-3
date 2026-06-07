"use client";

import { useState, useEffect, memo, useCallback, useId, useRef } from "react";
import {
  FiChevronDown,
  FiChevronUp,
  FiX,
  FiFilter,
  FiCalendar,
  FiUsers,
} from "react-icons/fi";

export interface SearchFilters {
  minRating: number;
  priceRange: string;
  country: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  rooms: number;
}

interface SearchFiltersProps {
  onFilterChange: (filters: SearchFilters) => void;
  isOpen: boolean;
  onClose: () => void;
  currentFilters?: SearchFilters;
}

const defaultFilters: SearchFilters = {
  minRating: 0,
  priceRange: "",
  country: "",
  checkIn: "",
  checkOut: "",
  adults: 2,
  rooms: 1,
};

const priceRanges = [
  { value: "", label: "Tất cả" },
  { value: "budget", label: "Phổ thông ($)" },
  { value: "mid", label: "Trung bình ($$)" },
  { value: "luxury", label: "Cao cấp ($$$)" },
];

const countries = [
  { value: "", label: "Tất cả quốc gia" },
  { value: "Vietnam", label: "Việt Nam" },
  { value: "Thailand", label: "Thái Lan" },
  { value: "Japan", label: "Nhật Bản" },
  { value: "South Korea", label: "Hàn Quốc" },
  { value: "Singapore", label: "Singapore" },
  { value: "Malaysia", label: "Malaysia" },
  { value: "Indonesia", label: "Indonesia" },
  { value: "Philippines", label: "Philippines" },
  { value: "Cambodia", label: "Campuchia" },
  { value: "France", label: "Pháp" },
  { value: "United States", label: "Mỹ" },
  { value: "United Kingdom", label: "Anh" },
  { value: "Australia", label: "Úc" },
];

const CollapsibleSection = memo(({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);
  const contentId = useId();

  return (
    <div className="border-b border-hairline last:border-b-0">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={isOpen}
        aria-controls={contentId}
        className="w-full flex items-center justify-between py-3 px-1 text-sm font-medium text-gray-200 hover:text-ink transition-colors"
      >
        {title}
        {isOpen ? <FiChevronUp className="w-4 h-4" /> : <FiChevronDown className="w-4 h-4" />}
      </button>
      {isOpen && (
        <div id={contentId} role="region" className="pb-4 px-1">
          {children}
        </div>
      )}
    </div>
  );
});
CollapsibleSection.displayName = "CollapsibleSection";

const SearchFilters = ({ onFilterChange, isOpen, onClose, currentFilters }: SearchFiltersProps) => {
  const [filters, setFilters] = useState<SearchFilters>(currentFilters ?? defaultFilters);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const [isDesktop, setIsDesktop] = useState(false);

  // Track viewport breakpoint so aria-hidden/tabIndex only apply on mobile
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    setIsDesktop(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  // Sync internal state with parent's current filters when the panel opens
  useEffect(() => {
    if (isOpen && currentFilters) {
      setFilters(currentFilters);
    }
  }, [isOpen, currentFilters]);

  // Auto-focus close button when panel opens (mobile)
  useEffect(() => {
    if (isOpen) {
      // Small delay to let the transition start
      const timer = setTimeout(() => closeBtnRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Focus trap: keep Tab/Shift+Tab inside the panel when open on mobile
  useEffect(() => {
    if (!isOpen) return;
    const panel = panelRef.current;
    if (!panel) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;

      const focusable = panel.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleApply = () => {
    onFilterChange(filters);
    onClose();
  };

  const handleClear = () => {
    setFilters(defaultFilters);
    onFilterChange(defaultFilters);
  };

  const hasActiveFilters =
    filters.minRating > 0 || filters.priceRange !== "" || filters.country !== "" ||
    filters.checkIn !== "" || filters.checkOut !== "" || filters.adults !== 2 || filters.rooms !== 1;

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <div
        ref={panelRef}
        className={`fixed top-0 left-0 h-full w-80 bg-panel z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } lg:relative lg:translate-x-0 lg:z-auto lg:w-72 lg:rounded-lg`}
        role="region"
        aria-label="Bộ lọc tìm kiếm"
        aria-hidden={isDesktop ? undefined : !isOpen}
        tabIndex={isDesktop ? undefined : (isOpen ? undefined : -1)}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-hairline">
            <div className="flex items-center gap-2 text-ink font-semibold">
              <FiFilter className="w-4 h-4" />
              Bộ lọc tìm kiếm
            </div>
            <button
              ref={closeBtnRef}
              type="button"
              onClick={onClose}
              className="p-1 text-ink hover:text-ink transition-colors lg:hidden"
              aria-label="Đóng bộ lọc"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-0">
            <CollapsibleSection title="Điểm liên quan">
              <div className="space-y-2">
                {[
                  { value: 0, label: "Tất cả" },
                  { value: 20, label: "≥ 20%" },
                  { value: 40, label: "≥ 40%" },
                  { value: 60, label: "≥ 60%" },
                  { value: 80, label: "≥ 80%" },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    <input
                      type="radio"
                      name="minRating"
                      value={opt.value}
                      checked={filters.minRating === opt.value}
                      onChange={() =>
                        setFilters((prev) => ({ ...prev, minRating: opt.value }))
                      }
                      className="w-4 h-4 text-sky-500 bg-fill border-hairline focus:ring-sky-500 focus:ring-offset-gray-800"
                    />
                    <span className="text-sm text-ink group-hover:text-ink transition-colors">
                      {opt.label}
                    </span>
                  </label>
                ))}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Khoảng giá">
              <div className="space-y-2">
                {priceRanges.map((range) => (
                  <label
                    key={range.value}
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    <input
                      type="radio"
                      name="priceRange"
                      value={range.value}
                      checked={filters.priceRange === range.value}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          priceRange: e.target.value,
                        }))
                      }
                      className="w-4 h-4 text-sky-500 bg-fill border-hairline focus:ring-sky-500 focus:ring-offset-gray-800"
                    />
                    <span className="text-sm text-ink group-hover:text-ink transition-colors">
                      {range.label}
                    </span>
                  </label>
                ))}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Quốc gia / Khu vực">
              <select
                value={filters.country}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, country: e.target.value }))
                }
                className="w-full px-3 py-2 bg-fill border border-hairline rounded-lg text-ink text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              >
                {countries.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </CollapsibleSection>

            <CollapsibleSection title="Ngày nhận / trả phòng">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-ink-soft mb-1">
                    <FiCalendar className="inline w-3 h-3 mr-1" />
                    Nhận phòng
                  </label>
                  <input
                    type="date"
                    value={filters.checkIn}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, checkIn: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-fill border border-hairline rounded-lg text-ink text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-ink-soft mb-1">
                    <FiCalendar className="inline w-3 h-3 mr-1" />
                    Trả phòng
                  </label>
                  <input
                    type="date"
                    value={filters.checkOut}
                    min={filters.checkIn || undefined}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, checkOut: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-fill border border-hairline rounded-lg text-ink text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Số khách & Phòng">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-ink flex items-center gap-1">
                    <FiUsers className="w-3 h-3" />
                    Người lớn
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setFilters((prev) => ({
                          ...prev,
                          adults: Math.max(1, prev.adults - 1),
                        }))
                      }
                      className="w-8 h-8 bg-fill border border-hairline rounded text-ink hover:bg-hairline transition-colors text-sm font-bold"
                      aria-label="Giảm số người lớn"
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-sm text-ink font-medium">
                      {filters.adults}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setFilters((prev) => ({
                          ...prev,
                          adults: Math.min(10, prev.adults + 1),
                        }))
                      }
                      className="w-8 h-8 bg-fill border border-hairline rounded text-ink hover:bg-hairline transition-colors text-sm font-bold"
                      aria-label="Tăng số người lớn"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm text-ink flex items-center gap-1">
                    <FiCalendar className="w-3 h-3" />
                    Phòng
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setFilters((prev) => ({
                          ...prev,
                          rooms: Math.max(1, prev.rooms - 1),
                        }))
                      }
                      className="w-8 h-8 bg-fill border border-hairline rounded text-ink hover:bg-hairline transition-colors text-sm font-bold"
                      aria-label="Giảm số phòng"
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-sm text-ink font-medium">
                      {filters.rooms}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setFilters((prev) => ({
                          ...prev,
                          rooms: Math.min(5, prev.rooms + 1),
                        }))
                      }
                      className="w-8 h-8 bg-fill border border-hairline rounded text-ink hover:bg-hairline transition-colors text-sm font-bold"
                      aria-label="Tăng số phòng"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </CollapsibleSection>
          </div>

          <div className="p-4 border-t border-hairline space-y-2">
            <button
              type="button"
              onClick={handleApply}
              className="w-full py-2.5 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors font-medium text-sm"
            >
              Áp dụng bộ lọc
            </button>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClear}
                className="w-full py-2.5 bg-fill text-ink rounded-lg hover:bg-hairline hover:text-ink transition-colors text-sm"
              >
                Xóa bộ lọc
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default SearchFilters;
