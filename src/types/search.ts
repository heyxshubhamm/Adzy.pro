export type SortBy =
  | "relevance"
  | "price_asc"
  | "price_desc"
  | "rating"
  | "newest"
  | "popular";

export interface SearchParams {
  q?: string;
  category?: string;
  subcategory?: string;
  tags?: string;
  min_price?: number;
  max_price?: number;
  delivery_days?: number;
  min_rating?: number;
  seller_level?: string;
  sort?: SortBy;
  page?: number;
  limit?: number;
}

export interface GigSearchResult {
  id: string;
  title: string;
  slug: string;
  cover_url: string | null;
  seller_name: string;
  seller_level: string | null;
  price_from: number;
  delivery_days_min: number;
  avg_rating: number | null;
  review_count: number;
  tags: string[];
  rank: number | null;
}

export interface CategoryFacet {
  name?: string;
  slug: string;
  count: number;
}

export interface SearchFacets {
  categories: CategoryFacet[];
  price_stats?: {
    min: number;
    max: number;
    avg: number;
  };
  rating_ranges?: Array<{ label: string; count: number }>;
}

export interface SearchResponse {
  results: GigSearchResult[];
  total: number;
  page: number;
  pages: number;
  query: string | null;
  facets: SearchFacets;
  suggestions: string[];
  took_ms: number;
}
