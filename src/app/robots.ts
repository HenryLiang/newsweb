import type { MetadataRoute } from 'next';

const BASE = process.env.SITE_BASE_URL ?? 'http://localhost:3100';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/search'],
    },
    sitemap: `${BASE}/sitemap.xml`,
  };
}
