import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';

/** 当前登录用户,未登录 401 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }
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
