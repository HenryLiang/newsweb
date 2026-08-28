import type { Metadata } from 'next';
import Link from 'next/link';
import { getStories } from '@/lib/cms';
import { formatDateTime, thumb } from '@/lib/format';

export const revalidate = 60;

export const metadata: Metadata = {
  title: '专题',
  description: '新视野新闻热门专题聚合。',
};

export default async function TopicsPage() {
  const stories = await getStories();

  return (
    <div className="rounded bg-white px-4 pb-4 md:px-6">
      <h1 className="border-b border-gray-100 py-3 text-xl font-bold">
        <span className="border-l-4 border-[var(--brand)] pl-2.5">专题</span>
      </h1>
      {stories.length === 0 && (
        <p className="py-10 text-center text-sm text-gray-400">
          暂无专题，在 CMS 中将文章挂到选题（Story）下即可生成专题。
        </p>
      )}
      <div className="grid grid-cols-1 gap-4 py-4 md:grid-cols-2 lg:grid-cols-3">
        {stories.map((s) => (
          <Link
            key={s.id}
            href={`/topics/${s.id}`}
            className="group overflow-hidden rounded border border-gray-100 transition-shadow hover:shadow-md"
          >
            {s.coverImage && (
              // eslint-disable-next-line @next/next/no-img-element -- 卡片封面，比例固定
              <img
                src={thumb(s.coverImage, '400x220') ?? ''}
                alt={s.title}
                className="aspect-[16/9] w-full object-cover"
              />
            )}
            <div className="p-3.5">
              <h2 className="news-title line-clamp-2 font-semibold leading-snug group-hover:text-[var(--brand)]">
                {s.title}
              </h2>
              {s.description && (
                <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-gray-500">
                  {s.description}
                </p>
              )}
              <p className="mt-2 text-xs text-gray-400">
                {s.articleCount} 篇 · 更新于 {formatDateTime(s.updatedAt, false)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
