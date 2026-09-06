import type { Metadata } from 'next';
import { getArticles } from '@/lib/cms';
import { ArticleList } from '@/components/ArticleCard';
import { Pagination } from '@/components/Pagination';
import { SubscribeButton } from '@/components/user/SubscribeButton';

export const revalidate = 60;

interface TagPageProps {
  params: Promise<{ tag: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({
  params,
}: TagPageProps): Promise<Metadata> {
  const { tag } = await params;
  const name = decodeURIComponent(tag);
  return { title: `#${name}`, description: `标签“${name}”下的新闻资讯。` };
}

export default async function TagPage({
  params,
  searchParams,
}: TagPageProps) {
  const { tag } = await params;
  const tagName = decodeURIComponent(tag);
  const { page: pageRaw } = await searchParams;
  const page = Math.max(1, Number(pageRaw) || 1);
  const result = await getArticles({ tag: tagName, page, pageSize: 20 });

  return (
    <div className="rounded bg-white px-4 pb-2 md:px-6">
      <div className="flex items-baseline justify-between border-b border-gray-100 py-3">
        <h1 className="text-xl font-bold">
          <span className="border-l-4 border-[var(--brand)] pl-2.5">
            #{tagName}
          </span>
          <span className="ml-2 text-xs font-normal text-gray-400">
            {result.meta.total} 条
          </span>
        </h1>
        <SubscribeButton tags={[tagName]} label={tagName} />
      </div>
      <ArticleList articles={result.data} />
      <Pagination
        page={page}
        totalPages={result.meta.totalPages}
        basePath={`/tag/${tag}`}
      />
    </div>
  );
}
