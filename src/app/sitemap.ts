import { MetadataRoute } from 'next';

const BASE_URL = 'https://adzy.pro';
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function safeFetch<T>(url: string): Promise<T[]> {
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 1. Static app routes
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL,                  lastModified: new Date(), changeFrequency: 'daily',   priority: 1.0 },
    { url: `${BASE_URL}/marketplace`, lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9 },
    { url: `${BASE_URL}/login`,       lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/signup`,      lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  ];

  // 2. CMS static pages from backend
  const pages = await safeFetch<{ slug: string }>(`${API}/pages/`);
  const pageRoutes: MetadataRoute.Sitemap = pages.map((p) => ({
    url: `${BASE_URL}/pages/${p.slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  // 3. Categories
  const categories = await safeFetch<{ slug: string }>(`${API}/categories`);
  const categoryRoutes: MetadataRoute.Sitemap = categories.map((cat) => ({
    url: `${BASE_URL}/category/${cat.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  // 4. Active gigs
  const gigs = await safeFetch<{ slug: string; updated_at: string }>(`${API}/gigs?status=active&limit=500`);
  const gigRoutes: MetadataRoute.Sitemap = gigs.map((g) => ({
    url: `${BASE_URL}/gigs/${g.slug}`,
    lastModified: g.updated_at ? new Date(g.updated_at) : new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  return [...staticRoutes, ...pageRoutes, ...categoryRoutes, ...gigRoutes];
}

