import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

const bodySchema = z.object({
  nickname: z.string().trim().min(1, '昵称不能为空').max(20, '昵称最多 20 字'),
});

/** 修改昵称(需登录) */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? '参数不正确' },
      { status: 400 },
    );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { nickname: parsed.data.nickname },
  });

  return NextResponse.json({ ok: true });
}
