'use client';

import { useEffect, useState } from 'react';
import { dispatchOpenLogin } from './UserMenu';

interface SubscribeButtonProps {
  tags: string[]; // 频道可能含多个标签,一次订阅/取消全部
  label: string; // 展示名,如频道名/标签名
}

/** 订阅按钮:挂在频道页/标签页头部。登录后状态从 /api/subscriptions 拉取 */
export function SubscribeButton({ tags, label }: SubscribeButtonProps) {
  const [subscribed, setSubscribed] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/subscriptions')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return;
        const mine: string[] = d.tags ?? [];
        setSubscribed(tags.every((t) => mine.includes(t)));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [tags]);

  async function toggle() {
    if (pending) return;
    setPending(true);
    const prev = subscribed;
    setSubscribed(!prev);
    try {
      const res = await fetch('/api/subscriptions', {
        method: prev ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags }),
      });
      if (res.status === 401) {
        setSubscribed(prev);
        dispatchOpenLogin();
        return;
      }
      if (!res.ok) setSubscribed(prev);
    } catch {
      setSubscribed(prev);
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={subscribed}
      aria-label={`${subscribed ? '取消订阅' : '订阅'}${label}`}
      className={`rounded-full border px-3.5 py-1 text-xs transition-colors disabled:opacity-50 ${
        subscribed
          ? 'border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)]'
          : 'border-gray-300 text-gray-500 hover:border-[var(--brand)] hover:text-[var(--brand)]'
      }`}
    >
      {subscribed ? '✓ 已订阅' : '+ 订阅'}
    </button>
  );
}
