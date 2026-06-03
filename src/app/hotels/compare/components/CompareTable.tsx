"use client";

import { FiStar, FiExternalLink, FiX } from "react-icons/fi";

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

const CompareTable: React.FC<CompareTableProps> = ({ hotels, onRemove }) => {
  if (hotels.length === 0) return null;

  const ratings = hotels.map((h) => h.rating);
  const maxRating = Math.max(...ratings);

  const prices = hotels.map((h) => {
    const match = h.priceRange.match(/([\d.]+)/);
    return match ? parseInt(match[1].replace(/\./g, "")) : Infinity;
  });
  const minPrice = Math.min(...prices);

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-gray-800 p-3 text-left text-sm font-medium text-gray-400 w-36 min-w-[144px] border-b border-gray-700" />
            {hotels.map((hotel) => (
              <th
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
            <td className="sticky left-0 z-10 bg-gray-800 p-3 text-sm font-medium text-gray-400 border-b border-gray-700">
              Tên
            </td>
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
            <td className="sticky left-0 z-10 bg-gray-800 p-3 text-sm font-medium text-gray-400 border-b border-gray-700">
              Địa chỉ
            </td>
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
            <td className="sticky left-0 z-10 bg-gray-800 p-3 text-sm font-medium text-gray-400 border-b border-gray-700">
              Đánh giá
            </td>
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
                  {Array.from({ length: hotel.rating }).map((_, i) => (
                    <FiStar
                      key={i}
                      className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400"
                    />
                  ))}
                  <span className="ml-1">{hotel.rating} sao</span>
                </span>
              </td>
            ))}
          </tr>
          <tr>
            <td className="sticky left-0 z-10 bg-gray-800 p-3 text-sm font-medium text-gray-400 border-b border-gray-700">
              Khoảng giá
            </td>
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
            <td className="sticky left-0 z-10 bg-gray-800 p-3 text-sm font-medium text-gray-400 border-b border-gray-700">
              Mô tả
            </td>
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
            <td className="sticky left-0 z-10 bg-gray-800 p-3 text-sm font-medium text-gray-400 border-b border-gray-700">
              URL
            </td>
            {hotels.map((hotel) => (
              <td
                key={hotel.id}
                className="p-3 text-center border-b border-gray-700"
              >
                {hotel.url ? (
                  <a
                    href={hotel.url}
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
            <td className="sticky left-0 z-10 bg-gray-800 p-3 text-sm font-medium text-gray-400">
              Hình ảnh
            </td>
            {hotels.map((hotel) => (
              <td key={hotel.id} className="p-3 text-center">
                {hotel.images.length > 0 ? (
                  <img
                    src={hotel.images[0]}
                    alt={hotel.name}
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
  );
};

export default CompareTable;
