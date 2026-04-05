import { cache } from "react";

export interface SiteConfig {
  "fee.buyer_service":      number;
  "fee.withdrawal_min":     number;
  "feature.maintenance_mode": boolean;
  "feature.registration_open": boolean;
  "content.hero_title":     string;
  "content.hero_subtitle":  string;
  "content.announcement_bar": string;
  "content.announcement_on": boolean;
  "seo.site_name":          string;
  [key: string]: any;
}

// React cache() deduplicates across a single request
export const getSiteConfig = cache(async (): Promise<SiteConfig> => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/public/config`,
    {
      next: { tags: ["site-config"], revalidate: 60 },
    }
  );
  if (!res.ok) return {} as SiteConfig;
  return res.json();
});

export const getFeatureFlag = cache(
  async (key: string, userId?: string): Promise<boolean> => {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/public/flags/${key}${userId ? `?user_id=${userId}` : ""}`,
      { next: { tags: [`flag-${key}`], revalidate: 60 } }
    );
    if (!res.ok) return false;
    const data = await res.json();
    return data.enabled ?? false;
  }
);
