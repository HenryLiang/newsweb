import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { verifyPassword } from '@/lib/password';
import { rateLimit, clientIp } from '@/lib/rate-limit';

const bodySchema = z.object({
  email: z.string().email().max(100),
  password: z.string().min(1).max(64),
});

/** 密码登录(验证码登录的并行方式;防爆破限流) */
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: '参数不正确' }, { status: 400 });
  }
  const email = parsed.data.email.toLowerCase();

  // 防爆破:同邮箱每分钟 5 次,同 IP 每分钟 20 次
  if (!rateLimit(`pw-login:email:${email}`, 5, 60 * 1000)) {
    return NextResponse.json(
      { error: '尝试太频繁,请一分钟后再试' },
      { status: 429 },
    );
  }
  if (!rateLimit(`pw-login:ip:${clientIp(request)}`, 20, 60 * 1000)) {
    return NextResponse.json(
      { error: '尝试太频繁,请稍后再试' },
      { status: 429 },
    );
  }

  const user = await prisma.user.findUnique({ where: { email } });
  // 不区分"账号不存在"和"密码错误",防账号枚举
  if (!user || (user.passwordHash && !verifyPassword(parsed.data.password, user.passwordHash))) {
    return NextResponse.json({ error: '邮箱或密码不正确' }, { status: 400 });
  }
  if (!user.passwordHash) {
    return NextResponse.json(
      { error: '该账号还未设置密码,请使用验证码登录' },
      { status: 400 },
    );
  }

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
