import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="mt-10 border-t border-gray-200 bg-white">
      <div className="mx-auto w-full max-w-[1200px] px-3 py-6 text-xs leading-6 text-gray-500 md:px-6">
        <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1">
          <Link href="/" className="hover:text-[var(--brand)]">
            关于我们
          </Link>
          <Link href="/" className="hover:text-[var(--brand)]">
            联系方式
          </Link>
          <Link href="/" className="hover:text-[var(--brand)]">
            版权声明
          </Link>
          <Link href="/topics" className="hover:text-[var(--brand)]">
            专题
          </Link>
          <Link href="/pics" className="hover:text-[var(--brand)]">
            图片
          </Link>
        </div>
        <p>新视野新闻 © {new Date().getFullYear()} 版权所有</p>
        <p className="text-gray-400">
          本站内容由 newcms 编辑发布系统提供 · 备案号占位（上线时替换）
        </p>
      </div>
    </footer>
  );
}
