import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getChannel } from '@/config/channels';
import { getArticles } from '@/lib/cms';
import { ArticleList } from '@/components/ArticleCard';
import { Pagination } from '@/components/Pagination';
import { SubscribeButton } from '@/components/user/SubscribeButton';

export const revalidate = 60;

interface ChannelPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({
  params,
}: ChannelPageProps): Promise<Metadata> {
  const { slug } = await params;
  const channel = getChannel(slug);
  if (!channel) return { title: '频道不存在' };
  return {
    title: `${channel.name}频道`,
    description: `新视野新闻${channel.name}频道：${channel.name}领域新闻资讯。`,
  };
}

export default async function ChannelPage({
  params,
  searchParams,
}: ChannelPageProps) {
  const { slug } = await params;
  const channel = getChannel(slug);
  if (!channel) notFound();

  const { page: pageRaw } = await searchParams;
  const page = Math.max(1, Number(pageRaw) || 1);
  const result = await getArticles({
    tag: channel.tags.join(',') || undefined,
    page,
    pageSize: 20,
  });

  return (
    <div className="rounded bg-white px-4 pb-2 md:px-6">
      <div className="flex items-baseline justify-between border-b border-gray-100 py-3">
        <h1 className="text-xl font-bold">
          <span className="border-l-4 border-[var(--brand)] pl-2.5">
            {channel.name}
          </span>
          <span className="ml-2 text-xs font-normal text-gray-400">
            {result.meta.total} 条
          </span>
        </h1>
        {/* 要闻频道(无标签)即全部文章,不可订阅 */}
        {channel.tags.length > 0 && (
          <SubscribeButton tags={channel.tags} label={channel.name} />
        )}
      </div>
      <ArticleList articles={result.data} />
      <Pagination
        page={page}
        totalPages={result.meta.totalPages}
        basePath={`/channel/${slug}`}
      />
    </div>
  );
}
