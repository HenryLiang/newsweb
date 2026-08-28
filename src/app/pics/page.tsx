import type { Metadata } from 'next';
import Link from 'next/link';
import { getArticles } from '@/lib/cms';
import { thumb } from '@/lib/format';

export const revalidate = 60;

export const metadata: Metadata = {
  title: '图片',
  description: '新视野新闻图片新闻。',
};

export default async function PicsPage() {
  const { data: articles } = await getArticles({ pageSize: 24 });
  const pics = articles.filter((a) => a.coverImage);

  return (
    <div className="rounded bg-white px-4 pb-4 md:px-6">
      <h1 className="border-b border-gray-100 py-3 text-xl font-bold">
        <span className="border-l-4 border-[var(--brand)] pl-2.5">图片</span>
      </h1>
      {pics.length === 0 && (
        <p className="py-10 text-center text-sm text-gray-400">
          暂无图片新闻，在 CMS 发布带封面的文章后即可展示。
        </p>
      )}
      <div className="columns-1 gap-4 py-4 sm:columns-2 lg:columns-3 [&>*]:mb-4">
        {pics.map((a) => (
          <Link
            key={a.id}
            href={`/article/${a.id}`}
            className="group block break-inside-avoid overflow-hidden rounded border border-gray-100 transition-shadow hover:shadow-md"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- 瀑布流高度随原图比例变化 */}
            <img
              src={thumb(a.coverImage, '420x') ?? ''}
              alt={a.title}
              className="w-full object-cover group-hover:brightness-90"
            />
            <div className="p-3">
              <h2 className="news-title line-clamp-2 text-sm font-medium leading-snug">
                {a.title}
              </h2>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
