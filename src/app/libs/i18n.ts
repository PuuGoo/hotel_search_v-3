/**
 * Minimal i18n (internationalization) module.
 *
 * Supports Vietnamese (vi) and English (en) with simple string interpolation.
 * Usage:
 *   import { t, setLocale, getLocale } from '@/app/libs/i18n';
 *   t('search.placeholder')  // => "Nhập tên khách sạn hoặc địa điểm..."
 *   t('results.count', { count: 5 })  // => "Tìm thấy 5 kết quả"
 */

export type Locale = "vi" | "en";

let currentLocale: Locale = "vi";

export function setLocale(locale: Locale) {
  currentLocale = locale;
  if (typeof window !== "undefined") {
    localStorage.setItem("app-locale", locale);
  }
}

export function getLocale(): Locale {
  return currentLocale;
}

/** Initialise locale from localStorage (call once on app mount). */
export function initLocale() {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("app-locale");
    if (stored === "vi" || stored === "en") {
      currentLocale = stored;
    }
  }
}

// ---- Translation dictionaries ----

const translations: Record<Locale, Record<string, string>> = {
  vi: {
    // Search
    "search.title": "Tìm kiếm khách sạn",
    "search.subtitle": "Tìm kiếm thông tin khách sạn với nhiều nguồn khác nhau",
    "search.placeholder": "Nhập tên khách sạn hoặc địa điểm...",
    "search.button": "Tìm kiếm",
    "search.searching": "Đang tìm...",
    "search.filters": "Bộ lọc",
    "search.engines": "{count} nguồn",

    // Results
    "results.found": "Tìm thấy {count} kết quả",
    "results.noResults": "Không tìm thấy kết quả nào phù hợp với bộ lọc",
    "results.empty": "Nhập từ khóa để bắt đầu tìm kiếm",
    "results.loadMore": "Xem thêm ({count} kết quả)",

    // Map
    "map.button": "Bản đồ",
    "map.development": "Tính năng bản đồ đang phát triển",

    // Saved searches
    "savedSearch.button": "Lưu tìm kiếm",
    "savedSearch.saved": "Đã lưu tìm kiếm",
    "savedSearch.deleted": "Đã xóa tìm kiếm đã lưu",
    "savedSearch.empty": "Chưa có tìm kiếm đã lưu",
    "savedSearch.title": "Tìm kiếm đã lưu",

    // History
    "history.title": "Lịch sử tìm kiếm",
    "history.empty": "Chưa có lịch sử tìm kiếm",
    "history.clearAll": "Xóa lịch sử",
    "history.showing": "Hiển thị {count} mục gần đây",

    // Sort
    "sort.label": "Sắp xếp kết quả",
    "sort.score": "Điểm cao nhất",
    "sort.az": "A → Z",
    "sort.za": "Z → A",
    "sort.priceLow": "Giá thấp → cao",
    "sort.priceHigh": "Giá cao → thấp",

    // General
    "general.error": "Có lỗi xảy ra",
    "general.loading": "Đang tải...",
    "general.bookmark": "Đã lưu bookmark",
    "general.compared": "Đã thêm vào danh sách so sánh",
  },

  en: {
    // Search
    "search.title": "Hotel Search",
    "search.subtitle": "Search hotel information across multiple sources",
    "search.placeholder": "Enter hotel name or location...",
    "search.button": "Search",
    "search.searching": "Searching...",
    "search.filters": "Filters",
    "search.engines": "{count} sources",

    // Results
    "results.found": "Found {count} results",
    "results.noResults": "No results found matching the filters",
    "results.empty": "Enter a keyword to start searching",
    "results.loadMore": "Load more ({count} results)",

    // Map
    "map.button": "Map",
    "map.development": "Map feature is under development",

    // Saved searches
    "savedSearch.button": "Save search",
    "savedSearch.saved": "Search saved",
    "savedSearch.deleted": "Saved search deleted",
    "savedSearch.empty": "No saved searches yet",
    "savedSearch.title": "Saved searches",

    // History
    "history.title": "Search history",
    "history.empty": "No search history yet",
    "history.clearAll": "Clear history",
    "history.showing": "Showing {count} recent items",

    // Sort
    "sort.label": "Sort results",
    "sort.score": "Highest score",
    "sort.az": "A → Z",
    "sort.za": "Z → A",
    "sort.priceLow": "Price low → high",
    "sort.priceHigh": "Price high → low",

    // General
    "general.error": "An error occurred",
    "general.loading": "Loading...",
    "general.bookmark": "Bookmark saved",
    "general.compared": "Added to comparison list",
  },
};

/**
 * Translate a key with optional interpolation.
 *
 * Interpolation placeholders use `{name}` syntax, e.g.:
 *   t('results.found', { count: 42 })  // => "Tìm thấy 42 kết quả"
 */
export function t(key: string, params?: Record<string, string | number>): string {
  const dict = translations[currentLocale] ?? translations.vi;
  let text = dict[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }
  return text;
}
