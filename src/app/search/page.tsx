import type { Metadata } from 'next';
import { getArticles } from '@/lib/cms';
import { ArticleList } from '@/components/ArticleCard';
import { Pagination } from '@/components/Pagination';

export const revalidate = 60;

export const metadata: Metadata = {
  title: '搜索',
  robots: { index: false },
};

interface SearchPageProps {
  searchParams: Promise<{ q?: string; page?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q, page: pageRaw } = await searchParams;
  const query = (q ?? '').trim();
  const page = Math.max(1, Number(pageRaw) || 1);
  const result = query
    ? await getArticles({ search: query, page, pageSize: 20 })
    : { data: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 } };

  return (
    <div className="rounded bg-white px-4 pb-2 md:px-6">
      <h1 className="border-b border-gray-100 py-3 text-xl font-bold">
        <span className="border-l-4 border-[var(--brand)] pl-2.5">
          {query ? `“${query}” 的搜索结果` : '搜索新闻'}
        </span>
        {query && (
          <span className="ml-2 text-xs font-normal text-gray-400">
            共 {result.meta.total} 条
          </span>
        )}
      </h1>
      {query && result.data.length === 0 && (
        <p className="py-10 text-center text-sm text-gray-400">
          未找到相关新闻，换个关键词试试。
        </p>
      )}
      <ArticleList articles={result.data} />
      {query && (
        <Pagination
          page={page}
          totalPages={result.meta.totalPages}
          basePath={`/search?q=${encodeURIComponent(query)}`}
        />
      )}
    </div>
  );
}
