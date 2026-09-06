import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

const STATUS_TABS = ['pending', 'published', 'rejected'] as const;

const actionSchema = z.object({
  commentId: z.string().min(1).max(32),
  action: z.enum(['approve', 'reject', 'delete']),
  note: z.string().max(200).optional(),
});

async function requireAdmin() {
  const user = await getSessionUser();
  if (!user) return { error: NextResponse.json({ error: '请先登录' }, { status: 401 }) };
  if (user.role !== 'admin') {
    return { error: NextResponse.json({ error: '无权限' }, { status: 403 }) };
  }
  return { user };
}

/** 审核队列:GET ?status=pending|published|rejected */
export async function GET(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const statusParam = new URL(request.url).searchParams.get('status') ?? 'pending';
  const status = STATUS_TABS.includes(statusParam as (typeof STATUS_TABS)[number])
    ? statusParam
    : 'pending';

  const comments = await prisma.comment.findMany({
    where: { status },
    orderBy: { createdAt: status === 'pending' ? 'asc' : 'desc' },
    take: 100,
    include: {
      user: { select: { nickname: true, email: true } },
      moderation: true,
    },
  });

  return NextResponse.json({
    comments: comments.map((c) => ({
      id: c.id,
      articleId: c.articleId,
      content: c.content,
      status: c.status,
      createdAt: c.createdAt,
      author: c.user.nickname,
      authorEmail: c.user.email,
      aiVerdict: c.moderation?.aiVerdict ?? null,
      aiLabels: c.moderation?.aiLabels ?? null,
      reviewedBy: c.moderation?.reviewedBy ?? null,
      reviewNote: c.moderation?.reviewNote ?? null,
    })),
  });
}

/** 人工审核:approve(发布/翻案) / reject(下架/驳回) / delete(删除) */
export async function POST(request: Request) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: '参数不正确' }, { status: 400 });
  }
  const { commentId, action, note } = parsed.data;

  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment) {
    return NextResponse.json({ error: '评论不存在' }, { status: 404 });
  }

  const status =
    action === 'approve' ? 'published' : action === 'reject' ? 'rejected' : 'deleted';

  await prisma.$transaction([
    prisma.comment.update({ where: { id: commentId }, data: { status } }),
    // moderation 记录可能不存在(理论上不会,兜底 upsert)
    prisma.commentModeration.upsert({
      where: { commentId },
      update: { reviewedBy: user.id, reviewedAt: new Date(), reviewNote: note ?? null },
      create: { commentId, reviewedBy: user.id, reviewedAt: new Date(), reviewNote: note ?? null },
    }),
  ]);

  return NextResponse.json({ ok: true, status });
}
