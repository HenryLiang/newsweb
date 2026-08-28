import type { MetadataRoute } from 'next';
import { getArticles, getStories } from '@/lib/cms';

const BASE =
  process.env.SITE_BASE_URL ?? 'http://localhost:3100';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [articles, stories] = await Promise.all([
    getArticles({ pageSize: 50 }),
    getStories(),
  ]);

  return [
    { url: BASE, changeFrequency: 'hourly', priority: 1 },
    { url: `${BASE}/pics`, changeFrequency: 'daily', priority: 0.6 },
    { url: `${BASE}/topics`, changeFrequency: 'daily', priority: 0.6 },
    ...stories.map((s) => ({
      url: `${BASE}/topics/${s.id}`,
      lastModified: new Date(s.updatedAt),
      changeFrequency: 'daily' as const,
      priority: 0.7,
    })),
    ...articles.data.map((a) => ({
      url: `${BASE}/article/${a.id}`,
      lastModified: new Date(a.publishedAt ?? a.createdAt),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ];
}
