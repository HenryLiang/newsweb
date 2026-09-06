import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';

const articleIdSchema = z.string().min(1).max(64);
const bodySchema = z.object({ articleId: articleIdSchema });

async function likeCount(articleId: string): Promise<number> {
  return prisma.like.count({ where: { articleId } });
}

/** 文章点赞数 + 当前用户是否已赞（未登录 liked=false） */
export async function GET(request: Request) {
  const articleId = articleIdSchema.safeParse(
    new URL(request.url).searchParams.get('articleId'),
  );
  if (!articleId.success) {
    return NextResponse.json({ error: '参数不正确' }, { status: 400 });
  }

  const user = await getSessionUser();
  const [count, mine] = await Promise.all([
    likeCount(articleId.data),
    user
      ? prisma.like.findUnique({
          where: { userId_articleId: { userId: user.id, articleId: articleId.data } },
        })
      : null,
  ]);

  return NextResponse.json({ count, liked: Boolean(mine) });
}

/** 点赞（幂等） */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  if (!rateLimit(`like:${user.id}`, 60, 60 * 1000)) {
    return NextResponse.json({ error: '操作太频繁' }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: '参数不正确' }, { status: 400 });
  }

  await prisma.like.upsert({
    where: { userId_articleId: { userId: user.id, articleId: parsed.data.articleId } },
    update: {},
    create: { userId: user.id, articleId: parsed.data.articleId },
  });

  return NextResponse.json({ count: await likeCount(parsed.data.articleId) });
}

/** 取消点赞 */
export async function DELETE(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: '参数不正确' }, { status: 400 });
  }

  await prisma.like.deleteMany({
    where: { userId: user.id, articleId: parsed.data.articleId },
  });

  return NextResponse.json({ count: await likeCount(parsed.data.articleId) });
}
