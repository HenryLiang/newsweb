import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getStoryDetail } from '@/lib/cms';
import { ArticleList } from '@/components/ArticleCard';
import { formatDateTime } from '@/lib/format';

export const revalidate = 60;
export const dynamicParams = true;

interface TopicPageProps {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams(): Promise<{ id: string }[]> {
  return [];
}

export async function generateMetadata({
  params,
}: TopicPageProps): Promise<Metadata> {
  const { id } = await params;
  const story = await getStoryDetail(id);
  if (!story) return { title: '专题不存在' };
  return {
    title: story.title,
    description: story.description ?? `专题：${story.title}`,
  };
}

export default async function TopicPage({ params }: TopicPageProps) {
  const { id } = await params;
  const story = await getStoryDetail(id);
  if (!story) notFound();

  return (
    <div className="rounded bg-white px-4 pb-2 md:px-6">
      <header className="border-b border-gray-100 py-4">
        <h1 className="text-2xl font-bold leading-snug">{story.title}</h1>
        {story.description && (
          <p className="mt-2 text-sm leading-relaxed text-gray-500">
            {story.description}
          </p>
        )}
        <p className="mt-2 text-xs text-gray-400">
          {story.articles.length} 篇 · 更新于{' '}
          {formatDateTime(story.updatedAt, false)}
        </p>
      </header>
      <ArticleList articles={story.articles} />
    </div>
  );
}
