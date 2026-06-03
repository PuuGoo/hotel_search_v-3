"use client";

import { useState } from "react";
import {
  FiChevronDown,
  FiChevronUp,
  FiX,
  FiFilter,
  FiStar,
} from "react-icons/fi";

export interface SearchFilters {
  minRating: number;
  priceRange: string;
  country: string;
}

interface SearchFiltersProps {
  onFilterChange: (filters: SearchFilters) => void;
  isOpen: boolean;
  onClose: () => void;
}

const defaultFilters: SearchFilters = {
  minRating: 0,
  priceRange: "",
  country: "",
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

const CollapsibleSection = ({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-gray-700 last:border-b-0">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-3 px-1 text-sm font-medium text-gray-200 hover:text-white transition-colors"
      >
        {title}
        {isOpen ? <FiChevronUp className="w-4 h-4" /> : <FiChevronDown className="w-4 h-4" />}
      </button>
      {isOpen && <div className="pb-4 px-1">{children}</div>}
    </div>
  );
};

const SearchFilters = ({ onFilterChange, isOpen, onClose }: SearchFiltersProps) => {
  const [filters, setFilters] = useState<SearchFilters>(defaultFilters);
  const [ratingHover, setRatingHover] = useState(0);

  const handleRatingClick = (rating: number) => {
    const newRating = filters.minRating === rating ? 0 : rating;
    setFilters((prev) => ({ ...prev, minRating: newRating }));
  };

  const handleApply = () => {
    onFilterChange(filters);
    onClose();
  };

  const handleClear = () => {
    setFilters(defaultFilters);
    onFilterChange(defaultFilters);
  };

  const hasActiveFilters =
    filters.minRating > 0 || filters.priceRange !== "" || filters.country !== "";

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <div
        className={`fixed top-0 left-0 h-full w-80 bg-gray-800 z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } lg:relative lg:translate-x-0 lg:z-auto lg:w-72 lg:rounded-lg`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <div className="flex items-center gap-2 text-white font-semibold">
              <FiFilter className="w-4 h-4" />
              Bộ lọc tìm kiếm
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-white transition-colors lg:hidden"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-0">
            <CollapsibleSection title="Đánh giá">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => handleRatingClick(star)}
                    onMouseEnter={() => setRatingHover(star)}
                    onMouseLeave={() => setRatingHover(0)}
                    className="p-0.5 transition-transform hover:scale-110"
                  >
                    <FiStar
                      className={`w-6 h-6 transition-colors ${
                        star <= (ratingHover || filters.minRating)
                          ? "text-yellow-400 fill-yellow-400"
                          : "text-gray-500"
                      }`}
                    />
                  </button>
                ))}
                {filters.minRating > 0 && (
                  <span className="ml-2 text-sm text-gray-400">
                    {filters.minRating}+ sao
                  </span>
                )}
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
                      className="w-4 h-4 text-sky-500 bg-gray-700 border-gray-600 focus:ring-sky-500 focus:ring-offset-gray-800"
                    />
                    <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
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
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              >
                {countries.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </CollapsibleSection>
          </div>

          <div className="p-4 border-t border-gray-700 space-y-2">
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
                className="w-full py-2.5 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 hover:text-white transition-colors text-sm"
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
