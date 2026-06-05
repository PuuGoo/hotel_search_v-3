// Shared types for the hotel search feature.
// Consolidates interfaces that were previously duplicated across
// page.tsx, ResultCard.tsx, and SearchSuggestions.tsx.

export interface SearchResult {
  id: string;
  title: string | null;
  url: string | null;
  snippet: string | null;
  position: number | null;
  score: number | null;
}

export interface PerEngineStat {
  engine: string;
  resultCount: number;
  duration: number;
  cached: boolean;
  error: string | null;
}

export interface Search {
  id: string;
  query: string;
  engine: string;
  engines?: string[];
  resultCount: number;
  duration: number | null;
  perEngineStats?: PerEngineStat[];
  results: SearchResult[];
}
