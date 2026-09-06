import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { hashPassword, verifyPassword, passwordStrengthError } from '@/lib/password';
import { rateLimit } from '@/lib/rate-limit';

const bodySchema = z.object({
  password: z.string().min(1).max(64),
  currentPassword: z.string().max(64).optional(),
});

/** 设置/修改密码(需登录;已设过密码则必须验证当前密码) */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  if (!rateLimit(`set-pw:${user.id}`, 10, 60 * 1000)) {
    return NextResponse.json({ error: '操作太频繁' }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: '参数不正确' }, { status: 400 });
  }

  const strengthError = passwordStrengthError(parsed.data.password);
  if (strengthError) {
    return NextResponse.json({ error: strengthError }, { status: 400 });
  }

  if (user.passwordHash) {
    const ok =
      parsed.data.currentPassword &&
      verifyPassword(parsed.data.currentPassword, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: '当前密码不正确' }, { status: 400 });
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: hashPassword(parsed.data.password) },
  });

  return NextResponse.json({ ok: true });
}
