import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { SiteHeader } from '@/components/SiteHeader';
import { ChannelNav } from '@/components/ChannelNav';
import { SiteFooter } from '@/components/SiteFooter';

export const metadata: Metadata = {
  title: {
    default: '新视野新闻 - 新闻资讯门户',
    template: '%s - 新视野新闻',
  },
  description:
    '新视野新闻：提供时政、财经、科技、体育、娱乐等全方位新闻资讯。',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <SiteHeader />
        <ChannelNav />
        <main className="mx-auto w-full max-w-[1200px] px-3 py-5 md:px-6">
          {children}
        </main>
        <SiteFooter />
        <Link
          href="#top"
          className="fixed bottom-6 right-6 hidden h-10 w-10 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-500 shadow-sm hover:text-[var(--brand)] md:flex"
          aria-label="返回顶部"
        >
          ↑
        </Link>
      </body>
    </html>
  );
}
