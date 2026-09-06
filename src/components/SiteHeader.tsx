import Link from 'next/link';
import { UserMenu } from './user/UserMenu';

/** 顶部蓝条：logo + 搜索框 + 用户菜单。搜索走 GET /search，纯服务端即可。 */
export function SiteHeader() {
  return (
    <header id="top" className="bg-[var(--brand)]">
      <div className="mx-auto flex h-14 w-full max-w-[1200px] items-center gap-4 px-3 md:px-6">
        <Link href="/" className="shrink-0">
          <span className="text-xl font-bold tracking-wide text-white md:text-2xl">
            新视野
            <span className="ml-1 hidden text-sm font-normal opacity-80 md:inline">
              NEWS
            </span>
          </span>
        </Link>
        <div className="ml-auto hidden items-baseline gap-3 text-xs text-white/80 md:flex">
          <Link href="/topics" className="hover:text-white">
            专题
          </Link>
          <Link href="/pics" className="hover:text-white">
            图片
          </Link>
        </div>
        <form action="/search" className="ml-2 md:ml-0">
          <div className="flex overflow-hidden rounded">
            <input
              type="search"
              name="q"
              placeholder="搜索新闻"
              aria-label="搜索新闻"
              className="w-36 border-0 bg-white/95 px-3 py-1.5 text-sm outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-white/60 md:w-52"
            />
            <button
              type="submit"
              className="bg-[var(--brand-dark)] px-3 py-1.5 text-sm text-white hover:bg-[#0a4c8a]"
              aria-label="搜索"
            >
              搜索
            </button>
          </div>
        </form>
        <UserMenu />
      </div>
    </header>
  );
}
