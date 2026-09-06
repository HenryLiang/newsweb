import { NextResponse } from 'next/server';
import { randomInt } from 'crypto';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { sendVerificationCodeMail } from '@/lib/mailer';

const bodySchema = z.object({
  email: z.string().email('邮箱格式不正确').max(100),
});

const CODE_TTL_MS = 5 * 60 * 1000; // 验证码 5 分钟有效

/** 发送登录验证码 */
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: '邮箱格式不正确' }, { status: 400 });
  }
  const email = parsed.data.email.toLowerCase();

  // 限流:同一邮箱 60s 一次;同一 IP 每日 20 次
  if (!rateLimit(`send-code:email:${email}`, 1, 60 * 1000)) {
    return NextResponse.json(
      { error: '发送太频繁,请 60 秒后再试' },
      { status: 429 },
    );
  }
  if (!rateLimit(`send-code:ip:${clientIp(request)}`, 20, 24 * 3600 * 1000)) {
    return NextResponse.json(
      { error: '今日发送次数已达上限' },
      { status: 429 },
    );
  }

  const code = randomInt(0, 1000000).toString().padStart(6, '0');
  await prisma.emailCode.upsert({
    where: { email },
    update: { code, expiresAt: new Date(Date.now() + CODE_TTL_MS), attempts: 0 },
    create: { code, email, expiresAt: new Date(Date.now() + CODE_TTL_MS) },
  });

  try {
    await sendVerificationCodeMail({ to: email, code });
  } catch (err) {
    console.error('[auth] 验证码邮件发送失败', err);
    return NextResponse.json(
      { error: '邮件发送失败,请稍后再试' },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
