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
  revalidatePath(`/article/${articleId}`);
  revalidatePath('/');
  revalidatePath('/sitemap.xml');
  // 频道、标签、选题与分页列表共享 articles tag，会一并失效。

  return NextResponse.json({ revalidated: true, articleId });
}
