import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';
import type { User } from '@prisma/client';
import { prisma } from './db';

export const SESSION_COOKIE = 'nw_session';
const SESSION_TTL_MS = 30 * 24 * 3600 * 1000; // 30 天
// 剩余有效期低于该阈值时滑动续期,避免每次请求都写库
const RENEW_THRESHOLD_MS = 15 * 24 * 3600 * 1000;

const ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
);

/** 登录成功后创建会话并写入 httpOnly cookie（仅 Route Handler 中调用） */
export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.session.create({ data: { token, userId, expiresAt } });

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    path: '/',
  });
}

/** 读取当前登录用户,未登录或会话过期返回 null。可在服务端组件/路由中使用 */
export async function getSessionUser(): Promise<User | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { token } }).catch(() => {});
    return null;
  }

  // 滑动续期:剩余不足一半时延长到 30 天
  if (session.expiresAt.getTime() - Date.now() < RENEW_THRESHOLD_MS) {
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await prisma.session.update({ where: { token }, data: { expiresAt } });
    // cookie 在服务端组件中不可写,尝试续期失败静默即可(DB 已续,浏览器关前都有效)
    try {
      store.set(SESSION_COOKIE, token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        expires: expiresAt,
        path: '/',
      });
    } catch {
      /* 服务端组件中忽略 */
    }
  }

  return session.user;
}

/** 登出:删会话、清 cookie（仅 Route Handler 中调用） */
export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { token } });
  }
  store.delete(SESSION_COOKIE);
}

/** 命中 ADMIN_EMAILS 的邮箱登录时自动升为 admin */
export function isAdminEmail(email: string): boolean {
  return ADMIN_EMAILS.has(email.toLowerCase());
}
