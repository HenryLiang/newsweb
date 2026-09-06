import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

const itemSchema = z.object({
  articleId: z.string().min(1).max(64),
  articleTitle: z.string().min(1).max(200),
  viewedAt: z.string().datetime().optional(),
});

// 支持单条(阅读时上报)或批量(登录后本地历史同步)
const bodySchema = z.union([
  itemSchema,
  z.object({ items: z.array(itemSchema).min(1).max(100) }),
]);

const KEEP_MAX = 200; // 每人最多保留的条数

/** 我的浏览历史(近 100 条,按时间倒序) */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  const history = await prisma.browsingHistory.findMany({
    where: { userId: user.id },
    orderBy: { viewedAt: 'desc' },
    take: 100,
  });
  return NextResponse.json({ history });
}

/** 记录浏览(同文章重复访问只更新时间) */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: '参数不正确' }, { status: 400 });
  }
  const items = 'items' in parsed.data ? parsed.data.items : [parsed.data];

  for (const item of items) {
    const viewedAt = item.viewedAt ? new Date(item.viewedAt) : new Date();
    await prisma.browsingHistory.upsert({
      where: {
        userId_articleId: { userId: user.id, articleId: item.articleId },
      },
      update: { viewedAt, articleTitle: item.articleTitle },
      create: {
        userId: user.id,
        articleId: item.articleId,
        articleTitle: item.articleTitle,
        viewedAt,
      },
    });
  }

  // 超出上限时裁掉最旧的
  const total = await prisma.browsingHistory.count({ where: { userId: user.id } });
  if (total > KEEP_MAX) {
    const stale = await prisma.browsingHistory.findMany({
      where: { userId: user.id },
      orderBy: { viewedAt: 'desc' },
      skip: KEEP_MAX,
      select: { articleId: true },
    });
    await prisma.browsingHistory.deleteMany({
      where: {
        userId: user.id,
        articleId: { in: stale.map((s) => s.articleId) },
      },
    });
  }

  return NextResponse.json({ ok: true });
}

/** 清空历史 */
export async function DELETE() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  await prisma.browsingHistory.deleteMany({ where: { userId: user.id } });
  return NextResponse.json({ ok: true });
}
