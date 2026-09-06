import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { createSession, isAdminEmail } from '@/lib/auth';

const bodySchema = z.object({
  email: z.string().email().max(100),
  code: z.string().regex(/^\d{6}$/, '验证码为 6 位数字'),
});

const MAX_ATTEMPTS = 5;

/** 校验验证码,首次验证即注册;成功则建立会话 */
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: '参数不正确' }, { status: 400 });
  }
  const email = parsed.data.email.toLowerCase();
  const { code } = parsed.data;

  const record = await prisma.emailCode.findUnique({ where: { email } });
  if (!record || record.expiresAt < new Date() || record.attempts >= MAX_ATTEMPTS) {
    return NextResponse.json(
      { error: '验证码已失效,请重新获取' },
      { status: 400 },
    );
  }
  if (record.code !== code) {
    await prisma.emailCode.update({
      where: { email },
      data: { attempts: { increment: 1 } },
    });
    return NextResponse.json({ error: '验证码不正确' }, { status: 400 });
  }

  // 验证通过,立即作废验证码
  await prisma.emailCode.delete({ where: { email } });

  const isAdmin = isAdminEmail(email);
  const user = await prisma.user.upsert({
    where: { email },
    update: isAdmin ? { role: 'admin' } : {},
    create: {
      email,
      nickname: `用户${Math.random().toString(36).slice(2, 8)}`,
      role: isAdmin ? 'admin' : 'user',
    },
  });

  await createSession(user.id);

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      role: user.role,
    },
  });
}
