'use client';

// 浏览历史的本地(localStorage)存取。匿名用户也能积累历史,登录后同步到服务端

export interface LocalHistoryItem {
  articleId: string;
  articleTitle: string;
  viewedAt: string; // ISO
}

const KEY = 'nw_history';
const LOCAL_MAX = 100;

export function getLocalHistory(): LocalHistoryItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function recordLocalHistory(item: LocalHistoryItem): void {
  const list = getLocalHistory().filter((h) => h.articleId !== item.articleId);
  list.unshift(item);
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, LOCAL_MAX)));
}

export function clearLocalHistory(): void {
  localStorage.removeItem(KEY);
}

/** 登录成功后调用:把本地历史上报服务端并清空本地 */
export async function syncLocalHistoryToServer(): Promise<void> {
  const items = getLocalHistory();
  if (items.length === 0) return;
  try {
    const res = await fetch('/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: items.map((h) => ({
          articleId: h.articleId,
          articleTitle: h.articleTitle,
          viewedAt: h.viewedAt,
        })),
      }),
    });
    if (res.ok) clearLocalHistory();
  } catch {
    /* 同步失败保留本地数据,下次登录再试 */
  }
}
