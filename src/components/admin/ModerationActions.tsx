'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ModerationActionsProps {
  commentId: string;
  actions: { action: 'approve' | 'reject' | 'delete'; label: string }[];
}

/** 审核操作按钮组,操作后刷新当前队列 */
export function ModerationActions({ commentId, actions }: ModerationActionsProps) {
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function run(action: string) {
    if (pending) return;
    setPending(true);
    try {
      const res = await fetch('/api/admin/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId, action }),
      });
      if (res.ok) router.refresh();
    } finally {
      setPending(false);
    }
  }

  const styleByAction: Record<string, string> = {
    approve: 'border-green-300 text-green-600 hover:bg-green-50',
    reject: 'border-amber-300 text-amber-600 hover:bg-amber-50',
    delete: 'border-red-300 text-red-500 hover:bg-red-50',
  };

  return (
    <div className="flex shrink-0 gap-2">
      {actions.map(({ action, label }) => (
        <button
          key={action}
          type="button"
          onClick={() => run(action)}
          disabled={pending}
          className={`rounded border px-3 py-1 text-xs disabled:opacity-50 ${styleByAction[action]}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
