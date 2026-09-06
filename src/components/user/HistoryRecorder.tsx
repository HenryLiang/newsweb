'use client';

import { useEffect } from 'react';
import { recordLocalHistory } from '@/lib/history';

interface HistoryRecorderProps {
  articleId: string;
  articleTitle: string;
}

/**
 * 文章页浏览记录器:始终写 localStorage;已登录则同时上报服务端。
 * 无 UI,仅副作用。
 */
export function HistoryRecorder({ articleId, articleTitle }: HistoryRecorderProps) {
  useEffect(() => {
    recordLocalHistory({
      articleId,
      articleTitle,
      viewedAt: new Date().toISOString(),
    });
    // 未登录时接口返回 401,静默忽略(本地已记录)
    fetch('/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articleId, articleTitle }),
    }).catch(() => {});
  }, [articleId, articleTitle]);

  return null;
}
