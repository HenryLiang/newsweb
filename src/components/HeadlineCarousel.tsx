'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { PublicArticle } from '@/lib/cms';
import { thumb } from '@/lib/format';

/**
 * 头条轮播：取最新若干篇带封面文章，5 秒自动切换。
 * 若无封面文章则不渲染（首页会退化为纯标题列表）。
 */
export function HeadlineCarousel({ articles }: { articles: PublicArticle[] }) {
  const slides = articles.filter((a) => a.coverImage);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return;
    const timer = setInterval(
      () => setIndex((i) => (i + 1) % slides.length),
      5000,
    );
    return () => clearInterval(timer);
  }, [slides.length]);

  if (slides.length === 0) return null;
  const current = slides[index % slides.length];

  return (
    <div className="relative aspect-[16/9] overflow-hidden rounded bg-gray-200">
      <Link href={`/article/${current.id}`} className="group block h-full">
        {/* eslint-disable-next-line @next/next/no-img-element -- 轮播层叠加淡入淡出，next/image 收益低 */}
        <img
          src={thumb(current.coverImage, '750x420') ?? ''}
          alt={current.title}
          className="h-full w-full object-cover transition-opacity duration-500 group-hover:brightness-90"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-10">
          <h2 className="news-title line-clamp-2 text-lg font-semibold text-white md:text-xl">
            {current.title}
          </h2>
        </div>
      </Link>
      {/* 指示点 */}
      <div className="absolute bottom-1.5 right-3 flex gap-1.5">
        {slides.map((s, i) => (
          <button
            key={s.id}
            type="button"
            aria-label={`第 ${i + 1} 张`}
            onClick={() => setIndex(i)}
            className={`h-1.5 w-1.5 rounded-full transition-colors ${
              i === index % slides.length ? 'bg-white' : 'bg-white/40'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
