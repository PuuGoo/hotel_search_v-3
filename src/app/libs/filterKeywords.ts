/**
 * Shared keyword dictionaries for price-range and country filtering.
 * Used by both the server-side search API and client-side hotel page filter.
 */

export const PRICE_KEYWORDS: Record<string, string[]> = {
  budget: ["rẻ", "giá rẻ", "budget", "cheap", "affordable", "tiết kiệm", "$"],
  mid: ["trung bình", "mid-range", "moderate", "$$", "3 sao", "4 sao"],
  luxury: ["cao cấp", "luxury", "5 sao", "resort", "premium", "$$$", "biệt thự"],
};

export const COUNTRY_KEYWORDS: Record<string, string[]> = {
  Vietnam: ["việt nam", "vietnam", "vietnamese", "sài gòn", "hà nội", "đà nẵng", "nha trang", "phú quốc", "hội an"],
  Thailand: ["thái lan", "thailand", "thai", "bangkok", "phuket", "chiang mai", "pattaya"],
  Japan: ["nhật bản", "japan", "japanese", "tokyo", "osaka", "kyoto", "hokkaido"],
  "South Korea": ["hàn quốc", "korea", "korean", "seoul", "busan", "jeju"],
  Singapore: ["singapore", "singaporean"],
  Malaysia: ["malaysia", "malaysian", "kuala lumpur", "penang"],
  Indonesia: ["indonesia", "indonesian", "bali", "jakarta"],
  Philippines: ["philippines", "philippine", "manila", "cebu", "boracay"],
  Cambodia: ["campuchia", "cambodia", "cambodian", "siem reap", "phnom penh"],
  France: ["pháp", "france", "french", "paris", "nice", "lyon"],
  "United States": ["mỹ", "usa", "us", "united states", "american", "new york", "los angeles", "las vegas", "miami", "hawaii"],
  "United Kingdom": ["anh", "uk", "united kingdom", "british", "london", "manchester", "edinburgh"],
  Australia: ["úc", "australia", "australian", "sydney", "melbourne"],
};
