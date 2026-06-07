"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FiSearch } from "react-icons/fi";

const SearchWidget: React.FC = () => {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/hotels?query=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="relative">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-soft" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm kiếm khách sạn..."
          className="w-full pl-10 pr-4 py-3 bg-fill border border-hairline rounded-lg text-ink placeholder-ink-soft focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
        />
      </div>
      <button
        type="submit"
        className="w-full py-2 bg-sky-500 hover:bg-sky-600 text-white font-medium rounded-lg transition-colors"
      >
        Tìm kiếm ngay
      </button>
    </form>
  );
};

export default SearchWidget;
