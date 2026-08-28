import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';

/**
 * newcms 文章发布/更新 webhook 接收端。
 * 校验共享 secret 后精确失效该文章缓存 + 全站列表缓存。
 */
export async function POST(request: Request) {
  const { articleId, secret } = await request.json().catch(() => ({
    articleId: undefined,
    secret: undefined,
  }));

  const expected = process.env.REVALIDATE_SECRET;
  if (!expected || secret !== expected) {
    return NextResponse.json(
      { message: 'invalid secret' },
      { status: 401 },
    );
  }

  if (typeof articleId !== 'string' || !articleId) {
    return NextResponse.json(
      { message: 'articleId required' },
      { status: 400 },
    );
  }

  // 精确刷新：该文章详情 + 所有文章列表/聚合页。
  revalidateTag(`article-${articleId}`);
  revalidateTag('articles');
  revalidatePath('/');
  // 兜底：分页与次要页面全部按 tag 失效即可，无需逐页 revalidatePath。

  return NextResponse.json({ revalidated: true, articleId });
}
