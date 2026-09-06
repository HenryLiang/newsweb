import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';

const articleIdSchema = z.string().min(1).max(64);
const bodySchema = z.object({
  articleId: articleIdSchema,
  // 收藏时冗余标题快照,我的收藏列表免回查 CMS
  articleTitle: z.string().min(1).max(200),
});
const deleteSchema = z.object({ articleId: articleIdSchema });

/**
 * GET ?articleId=xxx → { favorited }（需登录状态判断,未登录返回 false）
 * GET 无参数 → 我的收藏列表（需登录）
 */
export async function GET(request: Request) {
  const user = await getSessionUser();
  const articleIdParam = new URL(request.url).searchParams.get('articleId');

  if (articleIdParam) {
    const articleId = articleIdSchema.safeParse(articleIdParam);
    if (!articleId.success) {
      return NextResponse.json({ error: '参数不正确' }, { status: 400 });
    }
    const mine = user
      ? await prisma.favorite.findUnique({
          where: {
            userId_articleId: { userId: user.id, articleId: articleId.data },
          },
        })
      : null;
    return NextResponse.json({ favorited: Boolean(mine) });
  }

  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  const favorites = await prisma.favorite.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  return NextResponse.json({ favorites });
}

/** 收藏（幂等） */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  if (!rateLimit(`favorite:${user.id}`, 60, 60 * 1000)) {
    return NextResponse.json({ error: '操作太频繁' }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: '参数不正确' }, { status: 400 });
  }
  const { articleId, articleTitle } = parsed.data;

  await prisma.favorite.upsert({
    where: { userId_articleId: { userId: user.id, articleId } },
    update: { articleTitle },
    create: { userId: user.id, articleId, articleTitle },
  });

  return NextResponse.json({ favorited: true });
}

/** 取消收藏 */
export async function DELETE(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: '参数不正确' }, { status: 400 });
  }

  await prisma.favorite.deleteMany({
    where: { userId: user.id, articleId: parsed.data.articleId },
  });

  return NextResponse.json({ favorited: false });
}
