import Link from 'next/link';
import type { PublicArticle } from '@/lib/cms';
import { thumb, timeAgo } from '@/lib/format';

/** 文章流卡片：左文右图（无封面则纯文字）。 */
export function ArticleCard({ article }: { article: PublicArticle }) {
  const img = thumb(article.coverImage, '300x200');
  return (
    <article className="border-b border-gray-100 py-4 last:border-b-0">
      <Link href={`/article/${article.id}`} className="flex gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="news-title line-clamp-2 text-[17px] font-semibold leading-snug">
            {article.title}
          </h3>
          {article.excerpt && (
            <p className="mt-1.5 hidden line-clamp-2 text-sm leading-relaxed text-gray-500 md:block">
              {article.excerpt}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
            {article.author?.name && <span>{article.author.name}</span>}
            <span>{timeAgo(article.publishedAt ?? article.createdAt)}</span>
            {article.tags.slice(0, 3).map((tag) => (
              <Link
                key={tag}
                href={`/tag/${encodeURIComponent(tag)}`}
                className="text-[var(--brand)]/70 hover:text-[var(--brand)]"
              >
                #{tag}
              </Link>
            ))}
          </div>
        </div>
        {img && (
          // eslint-disable-next-line @next/next/no-img-element -- 尺寸由 thumb() 精确控制，object-cover 即可
          <img
            src={img}
            alt=""
            className="h-[75px] w-[110px] shrink-0 rounded object-cover md:h-[80px] md:w-[130px]"
          />
        )}
      </Link>
    </article>
  );
}

/** 纯标题列表行（首页频道分区/焦点区用）。 */
export function ArticleTitleRow({
  article,
  rank,
}: {
  article: PublicArticle;
  rank?: number;
}) {
  return (
    <li className="flex items-baseline gap-2 py-2">
      {rank != null && (
        <span
          className={`w-4 shrink-0 text-right text-sm font-bold ${
            rank <= 3 ? 'text-[var(--hot)]' : 'text-gray-400'
          }`}
        >
          {rank}
        </span>
      )}
      <Link
        href={`/article/${article.id}`}
        className="news-title line-clamp-1 flex-1 text-[15px] leading-6"
      >
        {article.title}
      </Link>
      <span className="hidden shrink-0 text-xs text-gray-400 sm:inline">
        {timeAgo(article.publishedAt ?? article.createdAt)}
      </span>
    </li>
  );
}

/** 文章流列表。 */
export function ArticleList({ articles }: { articles: PublicArticle[] }) {
  if (articles.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-gray-400">
        暂无内容，请在 CMS 发布文章后刷新。
      </p>
    );
  }
  return (
    <div>
      {articles.map((a) => (
        <ArticleCard key={a.id} article={a} />
      ))}
    </div>
  );
}
