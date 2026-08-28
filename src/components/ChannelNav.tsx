import Link from 'next/link';
import { CHANNELS } from '@/config/channels';

/** 频道导航条：桌面横排，移动端横向滚动。 */
export function ChannelNav() {
  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex w-full max-w-[1200px] items-center overflow-x-auto px-2 md:px-6 [&::-webkit-scrollbar]:hidden">
        {CHANNELS.map((ch) => (
          <Link
            key={ch.slug}
            href={ch.slug === 'top' ? '/' : `/channel/${ch.slug}`}
            className="shrink-0 whitespace-nowrap px-3.5 py-2.5 text-[15px] text-[#333] hover:text-[var(--brand)] md:px-4"
          >
            {ch.name}
          </Link>
        ))}
      </div>
    </nav>
  );
}
