import Link from 'next/link';

/** 分页：当前页高亮，上一页/下一页。 */
export function Pagination({
  page,
  totalPages,
  basePath,
}: {
  page: number;
  totalPages: number;
  basePath: string;
}) {
  if (totalPages <= 1) return null;

  const href = (p: number) =>
    p === 1 ? basePath : `${basePath}?page=${p}`;
  const numbers: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + 4);
  for (let p = Math.max(1, end - 4); p <= end; p++) numbers.push(p);

  return (
    <nav className="flex items-center justify-center gap-1.5 py-6 text-sm">
      {page > 1 && (
        <PageLink href={href(page - 1)}>&lt; 上一页</PageLink>
      )}
      {start > 1 && <PageLink href={href(1)}>1</PageLink>}
      {start > 2 && <span className="px-1 text-gray-400">…</span>}
      {numbers.map((p) => (
        <PageLink key={p} href={href(p)} active={p === page}>
          {p}
        </PageLink>
      ))}
      {end < totalPages - 1 && <span className="px-1 text-gray-400">…</span>}
      {end < totalPages && <PageLink href={href(totalPages)}>{totalPages}</PageLink>}
      {page < totalPages && (
        <PageLink href={href(page + 1)}>下一页 &gt;</PageLink>
      )}
    </nav>
  );
}

function PageLink({
  href,
  active,
  children,
}: {
  href: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`rounded px-3 py-1.5 ${
        active
          ? 'bg-[var(--brand)] text-white'
          : 'bg-white text-gray-600 hover:text-[var(--brand)]'
      }`}
    >
      {children}
    </Link>
  );
}
