import type { Metadata } from 'next';
import Link from 'next/link';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { timeAgo } from '@/lib/format';
import { LocalHistory } from '@/components/user/LocalHistory';
import { ClearHistoryButton } from '@/components/user/ClearHistoryButton';

// 浏览历史:登录看服务端记录,匿名看 localStorage(客户端组件)
export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: '浏览历史' };

export default async function HistoryPage() {
  const user = await getSessionUser();

  return (
    <div className="mx-auto max-w-[900px]">
      <div className="rounded bg-white px-5 py-4 md:px-8">
        <h1 className="border-b border-gray-100 pb-3 text-lg font-bold">
          浏览历史
        </h1>
        {user ? <ServerHistory userId={user.id} /> : <LocalHistory />}
      </div>
    </div>
  );
}

async function ServerHistory({ userId }: { userId: string }) {
  const history = await prisma.browsingHistory.findMany({
    where: { userId },
    orderBy: { viewedAt: 'desc' },
    take: 100,
  });

  if (history.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-gray-400">
        还没有浏览记录,去{' '}
        <Link href="/" className="text-[var(--brand)] hover:underline">
          首页
        </Link>{' '}
        看看
      </p>
    );
  }

  return (
    <>
      <div className="flex justify-end border-b border-gray-100 pb-2">
        <ClearHistoryButton />
      </div>
      <ul className="divide-y divide-gray-100">
        {history.map((h) => (
          <li key={h.articleId} className="flex items-center gap-4 py-3">
            <Link
              href={`/article/${h.articleId}`}
              className="min-w-0 flex-1 truncate text-[15px] text-gray-800 hover:text-[var(--brand)]"
            >
              {h.articleTitle}
            </Link>
            <span className="shrink-0 text-xs text-gray-400">
              {timeAgo(h.viewedAt.toISOString())}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
