'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getLocalHistory, clearLocalHistory, type LocalHistoryItem } from '@/lib/history';
import { timeAgo } from '@/lib/format';

/** 匿名用户的浏览历史(读 localStorage) */
export function LocalHistory() {
  const [items, setItems] = useState<LocalHistoryItem[] | null>(null);

  useEffect(() => {
    setItems(getLocalHistory());
  }, []);

  if (items === null) return <p className="py-10 text-center text-sm text-gray-400">加载中…</p>;

  if (items.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-gray-400">
        还没有浏览记录,去{' '}
        <Link href="/" className="text-[var(--brand)] hover:underline">
          首页
        </Link>{' '}
        看看
      </p>
    );
  }

  return (
    <>
      <div className="flex justify-end border-b border-gray-100 pb-2">
        <button
          type="button"
          onClick={() => {
            clearLocalHistory();
            setItems([]);
          }}
          className="text-xs text-gray-400 hover:text-red-500"
        >
          清空历史
        </button>
      </div>
      <ul className="divide-y divide-gray-100">
        {items.map((h) => (
          <li key={h.articleId} className="flex items-center gap-4 py-3">
            <Link
              href={`/article/${h.articleId}`}
              className="min-w-0 flex-1 truncate text-[15px] text-gray-800 hover:text-[var(--brand)]"
            >
              {h.articleTitle}
            </Link>
            <span className="shrink-0 text-xs text-gray-400">
              {timeAgo(h.viewedAt)}
            </span>
          </li>
        ))}
      </ul>
      <p className="py-4 text-center text-xs text-gray-400">
        当前是本地记录,登录后可跨设备同步
      </p>
    </>
  );
}
