import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getArticles } from '@/lib/cms';
import { ArticleList } from '@/components/ArticleCard';
import { SubscribeButton } from '@/components/user/SubscribeButton';
import { CHANNELS } from '@/config/channels';

// 私有页面:按会话渲染,不走 ISR 缓存
export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: '我的订阅' };

export default async function FeedPage() {
  const user = await getSessionUser();
  if (!user) redirect('/');

  const subs = await prisma.subscription.findMany({
    where: { userId: user.id },
    select: { tag: true },
    orderBy: { createdAt: 'desc' },
  });
  const tags = subs.map((s) => s.tag);

  // 订阅标签为空时展示可订阅的频道入口
  if (tags.length === 0) {
    return (
      <div className="mx-auto max-w-[900px]">
        <div className="rounded bg-white px-5 py-8 md:px-8">
          <h1 className="text-lg font-bold">我的订阅</h1>
          <p className="mt-6 text-center text-sm text-gray-400">
            还没有订阅任何频道,订阅后这里会聚合展示你关心的内容
          </p>
          <div className="mx-auto mt-6 flex max-w-md flex-wrap justify-center gap-3">
            {CHANNELS.filter((c) => c.tags.length > 0).map((c) => (
              <span key={c.slug} className="flex items-center gap-2">
                <Link
                  href={`/channel/${c.slug}`}
                  className="text-sm text-gray-700 hover:text-[var(--brand)]"
                >
                  {c.name}
                </Link>
                <SubscribeButton tags={c.tags} label={c.name} />
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 按订阅标签聚合最新文章(内容仍走 CMS ISR 缓存)
  const result = await getArticles({ tag: tags.join(','), pageSize: 30 });

  return (
    <div className="mx-auto max-w-[900px]">
      <div className="rounded bg-white px-4 pb-2 md:px-6">
        <div className="flex items-center justify-between border-b border-gray-100 py-3">
          <h1 className="text-lg font-bold">
            我的订阅
            <span className="ml-2 text-xs font-normal text-gray-400">
              {tags.join(' · ')}
            </span>
          </h1>
          <Link
            href="/user/favorites"
            className="text-xs text-gray-400 hover:text-[var(--brand)]"
          >
            我的收藏 →
          </Link>
        </div>
        {result.data.length === 0 ? (
          <p className="py-16 text-center text-sm text-gray-400">
            订阅的频道暂时没有新文章
          </p>
        ) : (
          <ArticleList articles={result.data} />
        )}
      </div>
    </div>
  );
}
