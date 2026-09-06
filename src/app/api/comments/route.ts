import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { moderateText } from '@/lib/moderation';

const articleIdSchema = z.string().min(1).max(64);
const bodySchema = z.object({
  articleId: articleIdSchema,
  content: z.string().trim().min(1, '评论不能为空').max(500, '评论最多 500 字'),
  parentId: z.string().max(32).optional(),
});

/** 文章的已发布评论(含一级回复,按时间正序) */
export async function GET(request: Request) {
  const articleId = articleIdSchema.safeParse(
    new URL(request.url).searchParams.get('articleId'),
  );
  if (!articleId.success) {
    return NextResponse.json({ error: '参数不正确' }, { status: 400 });
  }

  const comments = await prisma.comment.findMany({
    where: { articleId: articleId.data, status: 'published' },
    orderBy: { createdAt: 'asc' },
    take: 200,
    include: { user: { select: { nickname: true, avatarUrl: true } } },
  });

  return NextResponse.json({
    comments: comments.map((c) => ({
      id: c.id,
      parentId: c.parentId,
      content: c.content,
      createdAt: c.createdAt,
      author: c.user.nickname,
      avatarUrl: c.user.avatarUrl,
      authorId: c.userId,
    })),
  });
}

/**
 * 发表评论:AI(TMS)先审后发。
 * pass → published 立即可见;block → rejected;review/异常 → pending 转人工。
 */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  if (!rateLimit(`comment:${user.id}`, 3, 60 * 1000)) {
    return NextResponse.json({ error: '评论太频繁,请稍后再试' }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? '参数不正确' },
      { status: 400 },
    );
  }
  const { articleId, content, parentId } = parsed.data;

  // 回复必须挂在同文章的有效评论下(只支持一级回复)
  if (parentId) {
    const parent = await prisma.comment.findFirst({
      where: { id: parentId, articleId, parentId: null, status: 'published' },
    });
    if (!parent) {
      return NextResponse.json({ error: '回复的评论不存在' }, { status: 400 });
    }
  }

  const comment = await prisma.comment.create({
    data: { userId: user.id, articleId, content, parentId: parentId ?? null },
  });

  // 同步 AI 审核(TMS 内部 3s 超时,异常返回 error)
  const result = await moderateText(content);
  const status =
    result.verdict === 'pass'
      ? 'published'
      : result.verdict === 'block'
        ? 'rejected'
        : 'pending';

  await prisma.$transaction([
    prisma.comment.update({ where: { id: comment.id }, data: { status } }),
    prisma.commentModeration.create({
      data: {
        commentId: comment.id,
        aiVerdict: result.verdict,
        aiLabels: result.labels.length ? JSON.stringify(result.labels) : null,
      },
    }),
  ]);

  return NextResponse.json({
    id: comment.id,
    status,
    message:
      status === 'published'
        ? '评论已发布'
        : status === 'rejected'
          ? '评论未通过审核'
          : '评论已提交,审核通过后展示',
  });
}
