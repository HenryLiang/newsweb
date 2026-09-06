import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

// 一次可订阅多个标签(频道含多标签,如科技=科技+AI)
const tagsSchema = z.object({
  tags: z.array(z.string().trim().min(1).max(30)).min(1).max(10),
});

const MAX_SUBSCRIPTIONS = 50;

/** 我订阅的标签列表 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  const subs = await prisma.subscription.findMany({
    where: { userId: user.id },
    select: { tag: true },
  });
  return NextResponse.json({ tags: subs.map((s) => s.tag) });
}

/** 订阅(幂等) */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  const parsed = tagsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: '参数不正确' }, { status: 400 });
  }

  const existing = await prisma.subscription.count({ where: { userId: user.id } });
  if (existing >= MAX_SUBSCRIPTIONS) {
    return NextResponse.json(
      { error: `最多订阅 ${MAX_SUBSCRIPTIONS} 个标签` },
      { status: 400 },
    );
  }

  await prisma.subscription.createMany({
    data: parsed.data.tags.map((tag) => ({ userId: user.id, tag })),
    skipDuplicates: true,
  });

  const subs = await prisma.subscription.findMany({
    where: { userId: user.id },
    select: { tag: true },
  });
  return NextResponse.json({ tags: subs.map((s) => s.tag) });
}

/** 取消订阅 */
export async function DELETE(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  const parsed = tagsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: '参数不正确' }, { status: 400 });
  }

  await prisma.subscription.deleteMany({
    where: { userId: user.id, tag: { in: parsed.data.tags } },
  });
  return NextResponse.json({ ok: true });
}
