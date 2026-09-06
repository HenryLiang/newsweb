import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { formatDateTime } from '@/lib/format';
import { ModerationActions } from '@/components/admin/ModerationActions';

// 管理页:按会话渲染,不缓存
export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: '评论审核' };

const TABS = [
  { key: 'pending', label: '待审核' },
  { key: 'published', label: '已发布' },
  { key: 'rejected', label: '已拒绝' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

const AI_VERDICT_LABEL: Record<string, string> = {
  pass: 'AI 通过',
  block: 'AI 拦截',
  review: 'AI 存疑',
  error: 'AI 故障',
};

interface AdminCommentsPageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function AdminCommentsPage({
  searchParams,
}: AdminCommentsPageProps) {
  const user = await getSessionUser();
  if (!user) redirect('/');
  if (user.role !== 'admin') redirect('/');

  const { status } = await searchParams;
  const tab: TabKey = TABS.some((t) => t.key === status)
    ? (status as TabKey)
    : 'pending';

  const comments = await prisma.comment.findMany({
    where: { status: tab },
    orderBy: { createdAt: tab === 'pending' ? 'asc' : 'desc' },
    take: 100,
    include: {
      user: { select: { nickname: true, email: true } },
      moderation: true,
    },
  });

  const actionsByTab: Record<
    TabKey,
    { action: 'approve' | 'reject' | 'delete'; label: string }[]
  > = {
    pending: [
      { action: 'approve', label: '通过' },
      { action: 'reject', label: '拒绝' },
    ],
    published: [
      { action: 'reject', label: '下架' },
      { action: 'delete', label: '删除' },
    ],
    rejected: [
      { action: 'approve', label: '翻案发布' },
      { action: 'delete', label: '删除' },
    ],
  };

  return (
    <div className="mx-auto max-w-[900px]">
      <div className="rounded bg-white px-5 py-4 md:px-8">
        <h1 className="pb-3 text-lg font-bold">评论审核</h1>

        <div className="flex gap-4 border-b border-gray-100">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`/admin/comments?status=${t.key}`}
              className={`border-b-2 px-1 pb-2 text-sm ${
                tab === t.key
                  ? 'border-[var(--brand)] font-medium text-[var(--brand)]'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>

        {comments.length === 0 ? (
          <p className="py-16 text-center text-sm text-gray-400">
            当前队列是空的
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {comments.map((c) => (
              <li key={c.id} className="py-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="whitespace-pre-wrap break-words text-[15px] text-gray-800">
                      {c.content}
                    </p>
                    <p className="mt-1.5 flex flex-wrap gap-x-3 text-xs text-gray-400">
                      <span>
                        {c.user.nickname}（{c.user.email}）
                      </span>
                      <span>{formatDateTime(c.createdAt.toISOString())}</span>
                      <Link
                        href={`/article/${c.articleId}`}
                        className="text-[var(--brand)] hover:underline"
                      >
                        查看文章
                      </Link>
                      {c.moderation?.aiVerdict && (
                        <span>
                          {AI_VERDICT_LABEL[c.moderation.aiVerdict] ??
                            c.moderation.aiVerdict}
                          {c.moderation.aiLabels &&
                            ` · ${(JSON.parse(c.moderation.aiLabels) as string[]).join('/')}`}
                        </span>
                      )}
                    </p>
                  </div>
                  <ModerationActions
                    commentId={c.id}
                    actions={actionsByTab[tab]}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
