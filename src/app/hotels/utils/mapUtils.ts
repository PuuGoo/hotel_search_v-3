export interface HotelMarker {
  name: string;
  address: string;
  lat?: number;
  lng?: number;
  url?: string;
  rating?: number;
}

const cityCoordinates: Record<string, { lat: number; lng: number }> = {
  "hà nội": { lat: 21.0285, lng: 105.8542 },
  "ha noi": { lat: 21.0285, lng: 105.8542 },
  "hanoi": { lat: 21.0285, lng: 105.8542 },
  "sài gòn": { lat: 10.8231, lng: 106.6297 },
  "ho chi minh": { lat: 10.8231, lng: 106.6297 },
  "hồ chí minh": { lat: 10.8231, lng: 106.6297 },
  "tp hcm": { lat: 10.8231, lng: 106.6297 },
  "tp. hcm": { lat: 10.8231, lng: 106.6297 },
  "tp.hcm": { lat: 10.8231, lng: 106.6297 },
  "đà nẵng": { lat: 16.0544, lng: 108.2022 },
  "da nang": { lat: 16.0544, lng: 108.2022 },
  "danang": { lat: 16.0544, lng: 108.2022 },
  "nha trang": { lat: 12.2385, lng: 109.1967 },
  "đà lạt": { lat: 11.9404, lng: 108.4583 },
  "da lat": { lat: 11.9404, lng: 108.4583 },
  "dalat": { lat: 11.9404, lng: 108.4583 },
  "phú quốc": { lat: 10.2270, lng: 103.9635 },
  "phu quoc": { lat: 10.2270, lng: 103.9635 },
  "hội an": { lat: 15.8801, lng: 108.3380 },
  "hoi an": { lat: 15.8801, lng: 108.3380 },
  "huế": { lat: 16.4637, lng: 107.5909 },
  "hue": { lat: 16.4637, lng: 107.5909 },
  "quy nhơn": { lat: 13.7830, lng: 109.2190 },
  "quy nhon": { lat: 13.7830, lng: 109.2190 },
  "vũng tàu": { lat: 10.3460, lng: 107.0843 },
  "vung tau": { lat: 10.3460, lng: 107.0843 },
  "cần thơ": { lat: 10.0452, lng: 105.7469 },
  "can tho": { lat: 10.0452, lng: 105.7469 },
  "hải phòng": { lat: 20.8449, lng: 106.6881 },
  "hai phong": { lat: 20.8449, lng: 106.6881 },
  "ninh bình": { lat: 20.2506, lng: 105.9745 },
  "ninh binh": { lat: 20.2506, lng: 105.9745 },
  "sapa": { lat: 22.3364, lng: 103.8440 },
  "điện biên": { lat: 21.4173, lng: 103.0219 },
  "dien bien": { lat: 21.4173, lng: 103.0219 },
  "mũi né": { lat: 10.9322, lng: 108.2872 },
  "mui ne": { lat: 10.9322, lng: 108.2872 },
  "đà Nẵng": { lat: 16.0544, lng: 108.2022 },
};

const DEFAULT_CENTER = { lat: 14.0583, lng: 108.2772 };

function findCityCoordinates(text: string): { lat: number; lng: number } | null {
  const lower = text.toLowerCase().trim();

  for (const [city, coords] of Object.entries(cityCoordinates)) {
    if (lower.includes(city)) {
      return coords;
    }
  }
  return null;
}

function jitter(value: number, range: number): number {
  return value + (Math.random() - 0.5) * range * 2;
}

export function estimateCoordinates(
  address: string
): { lat: number; lng: number } {
  const coords = findCityCoordinates(address);
  if (coords) {
    return {
      lat: jitter(coords.lat, 0.02),
      lng: jitter(coords.lng, 0.02),
    };
  }

  return {
    lat: jitter(DEFAULT_CENTER.lat, 1.0),
    lng: jitter(DEFAULT_CENTER.lng, 1.0),
  };
}

export function calculateCenter(
  markers: HotelMarker[]
): { lat: number; lng: number } {
  const valid = markers.filter(
    (m) => typeof m.lat === "number" && typeof m.lng === "number"
  );

  if (valid.length === 0) return DEFAULT_CENTER;

  const sumLat = valid.reduce((s, m) => s + (m.lat || 0), 0);
  const sumLng = valid.reduce((s, m) => s + (m.lng || 0), 0);

  return {
    lat: sumLat / valid.length,
    lng: sumLng / valid.length,
  };
}

export function hotelsToMarkers(
  results: Array<{
    title: string | null;
    url: string | null;
    snippet: string | null;
    score: number | null;
  }>
): HotelMarker[] {
  return results.map((r) => {
    const addr = r.snippet || "";
    const coords = estimateCoordinates(`${r.title || ""} ${addr}`);
    const ratingScore = typeof r.score === "number" ? Math.min(5, Math.max(1, Math.round(r.score * 5))) : undefined;

    return {
      name: r.title || "Khách sạn không tên",
      address: addr.slice(0, 120),
      lat: coords.lat,
      lng: coords.lng,
      url: r.url || undefined,
      rating: ratingScore,
    };
  });
}
