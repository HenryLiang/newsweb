import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="py-16 text-center">
      <p className="text-6xl font-bold text-[var(--brand)]/30">404</p>
      <p className="mt-3 text-gray-500">页面不存在或文章未发布</p>
      <Link
        href="/"
        className="mt-6 inline-block rounded bg-[var(--brand)] px-6 py-2 text-sm text-white hover:bg-[var(--brand-dark)]"
      >
        返回首页
      </Link>
    </div>
  );
}
