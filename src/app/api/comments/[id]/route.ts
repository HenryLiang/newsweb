import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** 删除自己的评论(软删,admin 走 /api/admin/comments) */
export async function DELETE(_request: Request, { params }: RouteContext) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  const { id } = await params;
  const comment = await prisma.comment.findUnique({ where: { id } });
  if (!comment || comment.status === 'deleted') {
    return NextResponse.json({ error: '评论不存在' }, { status: 404 });
  }
  if (comment.userId !== user.id) {
    return NextResponse.json({ error: '只能删除自己的评论' }, { status: 403 });
  }

  await prisma.comment.update({ where: { id }, data: { status: 'deleted' } });
  return NextResponse.json({ ok: true });
}
