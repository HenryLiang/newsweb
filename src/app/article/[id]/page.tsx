import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import DOMPurify from 'isomorphic-dompurify';
import { getArticleDetail, getArticles } from '@/lib/cms';
import { ArticleList } from '@/components/ArticleCard';
import { ArticleActions } from '@/components/user/ArticleActions';
import { CommentSection } from '@/components/user/CommentSection';
import { HistoryRecorder } from '@/components/user/HistoryRecorder';
import { formatDateTime } from '@/lib/format';

export const revalidate = 60;
export const dynamicParams = true;

interface ArticlePageProps {
  params: Promise<{ id: string }>;
}

/**
 * CMS 停机时构建不失败：预渲染空集，未知 id 运行时按需渲染。
 */
export async function generateStaticParams(): Promise<{ id: string }[]> {
  return [];
}

const SITE_NAME = '新视野新闻';

export async function generateMetadata({
  params,
}: ArticlePageProps): Promise<Metadata> {
  const { id } = await params;
  const article = await getArticleDetail(id);
  if (!article) return { title: '文章不存在' };
  return {
    title: article.title,
    description: article.excerpt ?? article.subtitle ?? SITE_NAME,
    openGraph: {
      title: article.title,
      description: article.excerpt ?? undefined,
      images: article.coverImage ? [article.coverImage] : undefined,
      type: 'article',
      publishedTime: article.publishedAt ?? undefined,
    },
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { id } = await params;
  const article = await getArticleDetail(id);
  if (!article) notFound();

  const sanitized = DOMPurify.sanitize(article.content, {
    FORBID_TAGS: ['script', 'style', 'iframe', 'form'],
    FORBID_ATTR: ['onerror', 'onclick', 'onload'],
  });

  // 相关阅读：同标签最新文章（排除本文）。
  const related = article.tags.length
    ? await getArticles({ tag: article.tags.join(','), pageSize: 6 })
    : { data: [] as Awaited<ReturnType<typeof getArticles>>['data'] };

  const relatedList = related.data.filter((a) => a.id !== article.id).slice(0, 5);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    description: article.excerpt ?? undefined,
    image: article.coverImage ? [article.coverImage] : undefined,
    datePublished: article.publishedAt ?? article.createdAt,
    dateModified: article.updatedAt,
    author: article.author ? { '@type': 'Person', name: article.author.name } : undefined,
    publisher: { '@type': 'Organization', name: SITE_NAME },
  };

  return (
    <div className="mx-auto max-w-[900px]">
      {/* 浏览历史记录:无 UI,仅副作用 */}
      <HistoryRecorder articleId={article.id} articleTitle={article.title} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav className="mb-2 text-xs text-gray-400">
        <Link href="/" className="hover:text-[var(--brand)]">
          首页
        </Link>
        {article.tags[0] && (
          <>
            {' '}
            &gt;{' '}
            <Link
              href={`/tag/${encodeURIComponent(article.tags[0])}`}
              className="hover:text-[var(--brand)]"
            >
              {article.tags[0]}
            </Link>
          </>
        )}
      </nav>

      <article className="rounded bg-white p-5 md:p-8">
        <h1 className="text-2xl font-bold leading-snug md:text-[28px]">
          {article.title}
        </h1>
        {article.subtitle && (
          <p className="mt-2 text-base leading-relaxed text-gray-500">
            {article.subtitle}
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-gray-100 pb-4 text-xs text-gray-400">
          {article.author?.name && (
            <span className="text-gray-600">{article.author.name}</span>
          )}
          <span>{formatDateTime(article.publishedAt ?? article.createdAt)}</span>
        </div>

        {article.coverImage && (
          // eslint-disable-next-line @next/next/no-img-element -- 原图宽度未知，next/image 需要外部改图参数
          <img
            src={article.coverImage}
            alt={article.title}
            className="my-6 w-full rounded"
          />
        )}

        {article.tags.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {article.tags.map((tag) => (
              <Link
                key={tag}
                href={`/tag/${encodeURIComponent(tag)}`}
                className="rounded bg-[var(--brand)]/8 px-2.5 py-1 text-xs text-[var(--brand)] hover:bg-[var(--brand)]/15"
              >
                {tag}
              </Link>
            ))}
          </div>
        )}

        {/* CMS 富文本正文（已消毒） */}
        <div
          className="article-content"
          dangerouslySetInnerHTML={{ __html: sanitized }}
        />

        {/* 点赞/收藏:客户端组件,不影响页面 ISR 缓存 */}
        <ArticleActions articleId={article.id} articleTitle={article.title} />
      </article>

      {/* 评论区:客户端组件,AI 先审后发 */}
      <CommentSection articleId={article.id} />

      {relatedList.length > 0 && (
        <section className="mt-4 rounded bg-white px-5 pb-2 md:px-8">
          <h2 className="border-b border-gray-100 py-3 text-[17px] font-semibold">
            <span className="border-l-4 border-[var(--brand)] pl-2">
              相关阅读
            </span>
          </h2>
          <ArticleList articles={relatedList} />
        </section>
      )}
    </div>
  );
}
