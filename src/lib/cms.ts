/**
 * newcms 公开只读 API 客户端（服务端专用）。
 * 全部走 fetch + Next 数据缓存（ISR）：列表打 'articles' tag，
 * 详情额外打 'article-<id>' tag，供 webhook 精确刷新。
 * CMS 不可达时返回空数据而非抛错，保证构建/渲染不被 CMS 停机拖垮。
 */

const BASE_URL = process.env.CMS_API_BASE_URL ?? 'http://localhost:3001';

export interface PublicAuthor {
  id: string;
  name: string;
}

export interface PublicStoryRef {
  id: string;
  title: string;
}

export interface PublicArticle {
  id: string;
  title: string;
  subtitle: string | null;
  excerpt: string | null;
  coverImage: string | null;
  tags: string[];
  publishedAt: string | null;
  createdAt: string;
  storyId: string | null;
  author: PublicAuthor | null;
  story: PublicStoryRef | null;
}

export interface PublicArticleDetail extends PublicArticle {
  content: string;
  contentLanguage: string | null;
  updatedAt: string;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface TagCount {
  tag: string;
  count: number;
}

export interface PublicStory {
  id: string;
  title: string;
  description: string | null;
  tags: string[];
  updatedAt: string;
  articleCount: number;
  coverImage: string | null;
}

export interface PublicStoryDetail extends Omit<PublicStory, 'articleCount'> {
  articles: PublicArticle[];
}

const EMPTY_PAGE = <T>(): Paginated<T> => ({
  data: [],
  meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
});

/**
 * 服务端 fetch 封装：CMS 失败/超时返回 null，调用方走空数据兜底。
 */
async function cmsFetch<T>(path: string, tags: string[]): Promise<T | null> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      next: { revalidate: 60, tags },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export interface ArticleQuery {
  tag?: string;
  search?: string;
  storyId?: string;
  page?: number;
  pageSize?: number;
}

function buildQuery(query: ArticleQuery): string {
  const params = new URLSearchParams();
  if (query.tag) params.set('tag', query.tag);
  if (query.search) params.set('search', query.search);
  if (query.storyId) params.set('storyId', query.storyId);
  if (query.page) params.set('page', String(query.page));
  if (query.pageSize) params.set('pageSize', String(query.pageSize));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export async function getArticles(
  query: ArticleQuery = {},
): Promise<Paginated<PublicArticle>> {
  const result = await cmsFetch<Paginated<PublicArticle>>(
    `/public/articles${buildQuery(query)}`,
    ['articles'],
  );
  return result ?? EMPTY_PAGE<PublicArticle>();
}

export async function getArticleDetail(
  id: string,
): Promise<PublicArticleDetail | null> {
  return cmsFetch<PublicArticleDetail>(`/public/articles/${id}`, [
    'articles',
    `article-${id}`,
  ]);
}

export async function getTags(): Promise<TagCount[]> {
  const result = await cmsFetch<TagCount[]>(`/public/tags`, ['articles']);
  return result ?? [];
}

export async function getStories(): Promise<PublicStory[]> {
  const result = await cmsFetch<PublicStory[]>(`/public/stories`, ['articles']);
  return result ?? [];
}

export async function getStoryDetail(
  id: string,
): Promise<PublicStoryDetail | null> {
  return cmsFetch<PublicStoryDetail>(`/public/stories/${id}`, [
    'articles',
    `story-${id}`,
  ]);
}
