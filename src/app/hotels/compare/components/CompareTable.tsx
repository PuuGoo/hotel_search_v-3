"use client";

import React, { useRef, useEffect, useState } from "react";
import { FiStar, FiExternalLink, FiX } from "react-icons/fi";
import { safeHref } from "../../../libs/safeUrl";

/**
 * Validate an image URL — only allow http/https to prevent data: or javascript:
 * protocol abuse in <img src>. Returns null for unsafe URLs.
 */
function safeImageUrl(url: string | undefined): string | null {
  if (!url) return null;
  const result = safeHref(url);
  // Only allow http/https for images (block mailto:, tel:, etc.)
  if (result && /^https?:\/\//i.test(result)) return result;
  return null;
}

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

interface CompareTableProps {
  hotels: HotelData[];
  onRemove: (id: string) => void;
}

/** Pre-built star display component to avoid Array.from on every render */
const StarRating = React.memo(function StarRating({ rating }: { rating: number }) {
  const stars = [];
  for (let i = 0; i < rating; i++) {
    stars.push(
      <FiStar
        key={i}
        className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400"
      />
    );
  }
  return (
    <>
      {stars}
      <span className="ml-1">{rating} sao</span>
    </>
  );
});

const CompareTable: React.FC<CompareTableProps> = ({ hotels, onRemove }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollHint, setShowScrollHint] = useState(true);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const checkScroll = () => {
      const hasOverflow = el.scrollWidth > el.clientWidth;
      setShowScrollHint(hasOverflow && el.scrollLeft + el.clientWidth < el.scrollWidth - 10);
    };
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [hotels]);

  if (hotels.length === 0) return null;

  const ratings = hotels.map((h) => h.rating);
  const maxRating = Math.max(...ratings);

  const prices = hotels.map((h) => {
    const match = h.priceRange.match(/([\d.]+)/);
    return match ? parseInt(match[1].replace(/\./g, "")) : Infinity;
  });
  const minPrice = Math.min(...prices);

  return (
    <div className="relative">
      {/* Mobile scroll hint */}
      <p className="md:hidden text-xs text-gray-500 mb-2 flex items-center gap-1">
        👆 Kéo ngang để xem thêm
      </p>
      <div
        ref={scrollRef}
        className="overflow-x-auto"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
      {/* Gradient fade on right edge when scrollable */}
      {showScrollHint && (
        <div className="pointer-events-none absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-l from-gray-900 to-transparent z-20 md:hidden" />
      )}
      <table className="w-full border-collapse">
        <caption className="sr-only">So sánh khách sạn</caption>
        <thead>
          <tr>
            <th scope="col" className="sticky left-0 z-10 bg-gray-800 p-3 text-left text-sm font-medium text-gray-400 w-36 min-w-[144px] border-b border-gray-700" />
            {hotels.map((hotel) => (
              <th
                scope="col"
                key={hotel.id}
                className="p-3 text-center min-w-[220px] border-b border-gray-700"
              >
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={() => onRemove(hotel.id)}
                    className="self-end p-1 text-gray-400 hover:text-red-400 transition-colors"
                    title="Xóa khỏi so sánh"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-semibold text-white">
                    {hotel.name}
                  </span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row" className="sticky left-0 z-10 bg-gray-800 p-3 text-sm font-medium text-gray-400 border-b border-gray-700">
              Tên
            </th>
            {hotels.map((hotel) => (
              <td
                key={hotel.id}
                className="p-3 text-center text-sm text-white border-b border-gray-700"
              >
                {hotel.name}
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row" className="sticky left-0 z-10 bg-gray-800 p-3 text-sm font-medium text-gray-400 border-b border-gray-700">
              Địa chỉ
            </th>
            {hotels.map((hotel) => (
              <td
                key={hotel.id}
                className="p-3 text-center text-sm text-gray-300 border-b border-gray-700"
              >
                {hotel.address}
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row" className="sticky left-0 z-10 bg-gray-800 p-3 text-sm font-medium text-gray-400 border-b border-gray-700">
              Đánh giá
            </th>
            {hotels.map((hotel) => (
              <td
                key={hotel.id}
                className="p-3 text-center border-b border-gray-700"
              >
                <span
                  className={`inline-flex items-center gap-1 text-sm ${
                    hotel.rating === maxRating && hotels.length > 1
                      ? "text-green-400 font-semibold"
                      : "text-gray-300"
                  }`}
                >
                  <StarRating rating={hotel.rating} />
                </span>
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row" className="sticky left-0 z-10 bg-gray-800 p-3 text-sm font-medium text-gray-400 border-b border-gray-700">
              Khoảng giá
            </th>
            {hotels.map((hotel, idx) => (
              <td
                key={hotel.id}
                className="p-3 text-center border-b border-gray-700"
              >
                <span
                  className={`text-sm ${
                    prices[idx] === minPrice && hotels.length > 1
                      ? "text-green-400 font-semibold"
                      : "text-gray-300"
                  }`}
                >
                  {hotel.priceRange}
                </span>
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row" className="sticky left-0 z-10 bg-gray-800 p-3 text-sm font-medium text-gray-400 border-b border-gray-700">
              Mô tả
            </th>
            {hotels.map((hotel) => (
              <td
                key={hotel.id}
                className="p-3 text-center text-sm text-gray-300 border-b border-gray-700 max-w-[240px]"
              >
                <p className="line-clamp-3">{hotel.description}</p>
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row" className="sticky left-0 z-10 bg-gray-800 p-3 text-sm font-medium text-gray-400 border-b border-gray-700">
              URL
            </th>
            {hotels.map((hotel) => (
              <td
                key={hotel.id}
                className="p-3 text-center border-b border-gray-700"
              >
                {safeHref(hotel.url) ? (
                  <a
                    href={safeHref(hotel.url)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-sky-400 hover:underline"
                  >
                    <FiExternalLink className="w-3 h-3" />
                    Xem thêm
                  </a>
                ) : (
                  <span className="text-sm text-gray-500">Không có</span>
                )}
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row" className="sticky left-0 z-10 bg-gray-800 p-3 text-sm font-medium text-gray-400">
              Hình ảnh
            </th>
            {hotels.map((hotel) => (
              <td key={hotel.id} className="p-3 text-center">
                {safeImageUrl(hotel.images[0]) ? (
                  <img
                    src={safeImageUrl(hotel.images[0])!}
                    alt={hotel.name}
                    width={220}
                    height={128}
                    loading="lazy"
                    className="w-full h-32 object-cover rounded-lg"
                  />
                ) : (
                  <span className="text-sm text-gray-500">Không có</span>
                )}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
      </div>
    </div>
  );
};

export default CompareTable;
