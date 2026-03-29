export interface PackageOut {
  id: string;
  tier: "basic" | "standard" | "premium";
  name: string;
  description: string;
  price: number;
  delivery_days: number;
  revisions: number;
  features: string[];
}

export interface MediaItem {
  id: string;
  url: string;
  media_type: "image" | "video";
  is_cover: boolean;
  processed_urls?: Record<string, string>;
}

export interface SellerPublicOut {
  id: string;
  username: string;
  avatar_url?: string | null;
  display_name?: string | null;
  bio?: string | null;
  seller_level?: string | null;
  member_since: string;
  completed_orders: number;
  avg_rating?: number | null;
  review_count: number;
  response_time?: number | null;
  languages?: string[] | null;
  country?: string | null;
  is_available: boolean;
}

export interface ReviewOut {
  id: string;
  buyer_name: string;
  buyer_avatar?: string | null;
  rating: number;
  comment?: string | null;
  created_at: string;
}

export interface RelatedGigOut {
  id: string;
  title: string;
  slug: string;
  cover_url?: string | null;
  price_from: number;
  avg_rating?: number | null;
  review_count: number;
}

export interface GigDetailOut {
  id: string;
  title: string;
  slug: string;
  description: string;
  tags: string[];
  status: string;
  views: number;
  review_count: number;
  avg_rating?: number | null;
  created_at: string;
  seller: SellerPublicOut;
  packages: PackageOut[];
  requirements: Array<{
    id: string;
    question: string;
    input_type: string;
    is_required: boolean;
  }>;
  media: MediaItem[];
  reviews: ReviewOut[];
  related_gigs: RelatedGigOut[];
}
