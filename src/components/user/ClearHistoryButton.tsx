'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/** 清空服务端浏览历史 */
export function ClearHistoryButton() {
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function clear() {
    if (pending) return;
    setPending(true);
    try {
      const res = await fetch('/api/history', { method: 'DELETE' });
      if (res.ok) router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={clear}
      disabled={pending}
      className="text-xs text-gray-400 hover:text-red-500 disabled:opacity-50"
    >
      {pending ? '清空中…' : '清空历史'}
    </button>
  );
}
