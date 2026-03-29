import { MetadataRoute } from 'next';
import { api } from '@/lib/api';

const BASE_URL = 'https://adzy.pro';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 1. Static Routes
  const staticRoutes = [
    '',
    '/marketplace',
    '/admin',
    '/login',
    '/register',
  ].map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 1.0,
  }));

  // 2. Fetch Categories
  let categoryRoutes: MetadataRoute.Sitemap = [];
  try {
    const categories: any[] = await api('/categories');
    categoryRoutes = categories.map((cat) => ({
      url: `${BASE_URL}/category/${cat.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));
  } catch (e) {
    console.error('Sitemap: Failed to fetch categories', e);
  }

  // 3. Fetch Listings
  let listingRoutes: MetadataRoute.Sitemap = [];
  try {
    const listings: any[] = await api('/listings');
    listingRoutes = listings.map((l) => ({
      url: `${BASE_URL}/listing/${l.slug}`,
      lastModified: new Date(l.created_at),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }));
  } catch (e) {
    console.error('Sitemap: Failed to fetch listings', e);
  }

  return [...staticRoutes, ...categoryRoutes, ...listingRoutes];
}
