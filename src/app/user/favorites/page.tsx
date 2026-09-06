import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { formatDateTime } from '@/lib/format';
import { UnfavoriteButton } from '@/components/user/UnfavoriteButton';

// 私有页面:按会话渲染,不走 ISR 缓存
export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: '我的收藏' };

export default async function FavoritesPage() {
  const user = await getSessionUser();
  if (!user) redirect('/');

  const favorites = await prisma.favorite.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return (
    <div className="mx-auto max-w-[900px]">
      <div className="rounded bg-white px-5 py-4 md:px-8">
        <h1 className="border-b border-gray-100 pb-3 text-lg font-bold">
          我的收藏
          <span className="ml-2 text-sm font-normal text-gray-400">
            共 {favorites.length} 篇
          </span>
        </h1>

        {favorites.length === 0 ? (
          <p className="py-16 text-center text-sm text-gray-400">
            还没有收藏文章,去{' '}
            <Link href="/" className="text-[var(--brand)] hover:underline">
              首页
            </Link>{' '}
            逛逛吧
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {favorites.map((fav) => (
              <li key={fav.articleId} className="flex items-center gap-4 py-3">
                <Link
                  href={`/article/${fav.articleId}`}
                  className="min-w-0 flex-1 truncate text-[15px] text-gray-800 hover:text-[var(--brand)]"
                >
                  {fav.articleTitle}
                </Link>
                <span className="hidden shrink-0 text-xs text-gray-400 md:inline">
                  {formatDateTime(fav.createdAt.toISOString())}
                </span>
                <UnfavoriteButton articleId={fav.articleId} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
