"use client";

import { useState, useCallback } from "react";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import dynamic from "next/dynamic";

const CompareTable = dynamic(() => import("./components/CompareTable"), { ssr: false });
const AddHotelModal = dynamic(() => import("./components/AddHotelModal"), { ssr: false });

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

const ComparePage = () => {
  const [hotels, setHotels] = useState<HotelData[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

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
    setHotels([]);
  }, []);

  return (
    <div className="h-full bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              So sánh khách sạn
            </h1>
            <p className="text-gray-400">
              So sánh tối đa {MAX_HOTELS} khách sạn side-by-side
            </p>
          </div>
          <div className="flex items-center gap-3">
            {hotels.length > 0 && (
              <button
                onClick={handleClear}
                className="flex items-center gap-2 px-4 py-2.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors text-sm"
              >
                <FiTrash2 className="w-4 h-4" />
                Xóa tất cả
              </button>
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
            <p className="text-lg text-gray-400">
              Chưa có khách sạn để so sánh
            </p>
            <p className="text-sm text-gray-500 mt-2">
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
          <div className="bg-gray-800 rounded-lg overflow-hidden">
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
  );
};

export default ComparePage;
