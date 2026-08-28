import Link from 'next/link';
import type { PublicArticle, TagCount } from '@/lib/cms';
import { thumb } from '@/lib/format';
import { ArticleTitleRow } from './ArticleCard';

/** 右栏：热门排行 + 热图 + 标签云。 */
export function Sidebar({
  hot,
  pics,
  tags,
}: {
  hot: PublicArticle[];
  pics: PublicArticle[];
  tags: TagCount[];
}) {
  return (
    <aside className="space-y-4">
      <SidebarBox title="热点排行">
        <ol className="px-4 pb-2">
          {hot.map((a, i) => (
            <ArticleTitleRow key={a.id} article={a} rank={i + 1} />
          ))}
        </ol>
      </SidebarBox>

      {pics.length > 0 && (
        <SidebarBox title="热图">
          <div className="grid grid-cols-3 gap-1.5 p-3">
            {pics.slice(0, 6).map((a) => (
              <Link
                key={a.id}
                href={`/article/${a.id}`}
                title={a.title}
                className="relative block aspect-square overflow-hidden rounded"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- 固定小方图 */}
                <img
                  src={thumb(a.coverImage, '200x200') ?? ''}
                  alt={a.title}
                  className="h-full w-full object-cover transition-transform hover:scale-105"
                />
              </Link>
            ))}
          </div>
        </SidebarBox>
      )}

      {tags.length > 0 && (
        <SidebarBox title="标签云">
          <div className="flex flex-wrap gap-2 px-4 pb-4 pt-1">
            {tags.slice(0, 24).map((t) => (
              <Link
                key={t.tag}
                href={`/tag/${encodeURIComponent(t.tag)}`}
                className="rounded bg-gray-100 px-2.5 py-1 text-xs text-gray-600 transition-colors hover:bg-[var(--brand)]/10 hover:text-[var(--brand)]"
              >
                {t.tag}
                <span className="ml-0.5 text-gray-400">{t.count}</span>
              </Link>
            ))}
          </div>
        </SidebarBox>
      )}
    </aside>
  );
}

function SidebarBox({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded bg-white">
      <h3 className="border-l-4 border-[var(--brand)] px-4 py-2.5 text-[15px] font-semibold">
        {title}
      </h3>
      {children}
    </section>
  );
}
