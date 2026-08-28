import Link from 'next/link';
import { getArticles, getTags, getStories } from '@/lib/cms';
import { CHANNELS } from '@/config/channels';
import { HeadlineCarousel } from '@/components/HeadlineCarousel';
import { ArticleList, ArticleTitleRow } from '@/components/ArticleCard';
import { Sidebar } from '@/components/Sidebar';
import { formatDateTime } from '@/lib/format';

export const revalidate = 60;

export default async function HomePage() {
  // 并行拉取各分区数据（全部走 ISR 缓存）。
  const [latest, hot, pics, tags, stories, ...channelLists] = await Promise.all(
    [
      getArticles({ pageSize: 15 }),
      getArticles({ pageSize: 10 }),
      getArticles({ pageSize: 6 }),
      getTags(),
      getStories(),
      ...CHANNELS.filter((c) => c.slug !== 'top').map((c) =>
        getArticles({ tag: c.tags.join(','), pageSize: 5 }),
      ),
    ],
  );

  const articles = latest.data;
  const focus = articles.slice(0, 5); // 轮播 + 焦点标题
  const rest = articles.slice(5);
  const nonTopChannels = CHANNELS.filter((c) => c.slug !== 'top');

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr-300px]">
      <div className="min-w-0">
        {/* 头条区：轮播 + 焦点标题列表 */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-[2fr-1.2fr]">
          <HeadlineCarousel articles={focus} />
          <div className="rounded bg-white p-4">
            <h2 className="mb-1 border-b border-gray-100 pb-2 text-[15px] font-semibold">
              <span className="border-l-4 border-[var(--brand)] pl-2">
                今日焦点
              </span>
            </h2>
            <ul className="divide-y divide-gray-50">
              {focus.map((a) => (
                <ArticleTitleRow key={a.id} article={a} />
              ))}
            </ul>
          </div>
        </section>

        {/* 要闻文章流 */}
        <section className="mt-4 rounded bg-white px-4 pb-2">
          <h2 className="border-b border-gray-100 py-3 text-[17px] font-semibold">
            <span className="border-l-4 border-[var(--brand)] pl-2">要闻</span>
          </h2>
          <ArticleList articles={rest} />
        </section>

        {/* 各频道分区 */}
        {nonTopChannels.map((channel, i) => {
          const list = channelLists[i]?.data ?? [];
          if (list.length === 0) return null;
          return (
            <section key={channel.slug} className="mt-4 rounded bg-white px-4 pb-2">
              <div className="flex items-baseline justify-between border-b border-gray-100 py-3">
                <h2 className="text-[17px] font-semibold">
                  <span className="border-l-4 border-[var(--brand)] pl-2">
                    {channel.name}
                  </span>
                </h2>
                <Link
                  href={`/channel/${channel.slug}`}
                  className="text-xs text-gray-400 hover:text-[var(--brand)]"
                >
                  更多 &gt;
                </Link>
              </div>
              <ul className="grid grid-cols-1 divide-y divide-gray-50 md:grid-cols-2 md:divide-x md:px-2 [&>li]:md:px-4">
                {list.map((a) => (
                  <ArticleTitleRow key={a.id} article={a} />
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      {/* 右栏 */}
      <div className="min-w-0">
        <Sidebar hot={hot.data} pics={pics.data} tags={tags} />
        {stories.length > 0 && (
          <section className="overflow-hidden rounded bg-white">
            <h3 className="border-l-4 border-[var(--brand)] px-4 py-2.5 text-[15px] font-semibold">
              热门专题
            </h3>
            <ul className="divide-y divide-gray-50">
              {stories.slice(0, 5).map((s) => (
                <li key={s.id} className="px-4 py-2.5">
                  <Link
                    href={`/topics/${s.id}`}
                    className="news-title line-clamp-1 text-sm font-medium"
                  >
                    {s.title}
                  </Link>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {s.articleCount} 篇 · {formatDateTime(s.updatedAt, false)}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
