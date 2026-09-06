'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/** 我的收藏列表里的取消收藏按钮 */
export function UnfavoriteButton({ articleId }: { articleId: string }) {
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function unfavorite() {
    if (pending) return;
    setPending(true);
    try {
      const res = await fetch('/api/favorites', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId }),
      });
      if (res.ok) router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={unfavorite}
      disabled={pending}
      className="shrink-0 rounded border border-gray-200 px-3 py-1 text-xs text-gray-500 hover:border-red-300 hover:text-red-500 disabled:opacity-50"
    >
      {pending ? '取消中…' : '取消收藏'}
    </button>
  );
}
