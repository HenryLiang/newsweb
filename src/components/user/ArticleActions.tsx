'use client';

import { useEffect, useState } from 'react';
import { dispatchOpenLogin } from './UserMenu';

interface ArticleActionsProps {
  articleId: string;
  articleTitle: string;
}

/**
 * 文章互动区:点赞 + 收藏。页面本体保持 ISR 静态缓存,
 * 用户相关状态(计数/我是否已赞)由本组件挂载后按需拉取。
 */
export function ArticleActions({ articleId, articleTitle }: ArticleActionsProps) {
  const [likeCount, setLikeCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(`/api/likes?articleId=${encodeURIComponent(articleId)}`).then((r) =>
        r.json(),
      ),
      fetch(`/api/favorites?articleId=${encodeURIComponent(articleId)}`).then((r) =>
        r.json(),
      ),
    ])
      .then(([likes, favorites]) => {
        if (cancelled) return;
        setLikeCount(likes.count ?? 0);
        setLiked(Boolean(likes.liked));
        setFavorited(Boolean(favorites.favorited));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [articleId]);

  async function toggleLike() {
    if (pending) return;
    setPending(true);
    // 乐观更新,失败回滚
    const prevLiked = liked;
    const prevCount = likeCount;
    setLiked(!prevLiked);
    setLikeCount(prevLiked ? prevCount - 1 : prevCount + 1);
    try {
      const res = await fetch('/api/likes', {
        method: prevLiked ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId }),
      });
      if (res.status === 401) {
        setLiked(prevLiked);
        setLikeCount(prevCount);
        dispatchOpenLogin();
        return;
      }
      const data = await res.json();
      if (typeof data.count === 'number') setLikeCount(data.count);
    } catch {
      setLiked(prevLiked);
      setLikeCount(prevCount);
    } finally {
      setPending(false);
    }
  }

  async function toggleFavorite() {
    if (pending) return;
    setPending(true);
    const prev = favorited;
    setFavorited(!prev);
    try {
      const res = await fetch('/api/favorites', {
        method: prev ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          prev ? { articleId } : { articleId, articleTitle },
        ),
      });
      if (res.status === 401) {
        setFavorited(prev);
        dispatchOpenLogin();
        return;
      }
      if (!res.ok) setFavorited(prev);
    } catch {
      setFavorited(prev);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-8 flex items-center justify-center gap-4 border-t border-gray-100 pt-6">
      <button
        type="button"
        onClick={toggleLike}
        disabled={pending}
        aria-pressed={liked}
        className={`flex items-center gap-1.5 rounded-full border px-5 py-2 text-sm transition-colors ${
          liked
            ? 'border-red-400 bg-red-50 text-red-500'
            : 'border-gray-200 text-gray-600 hover:border-red-300 hover:text-red-500'
        }`}
      >
        <span aria-hidden>{liked ? '❤️' : '🤍'}</span>
        点赞 {likeCount > 0 && <span>{likeCount}</span>}
      </button>
      <button
        type="button"
        onClick={toggleFavorite}
        disabled={pending}
        aria-pressed={favorited}
        className={`flex items-center gap-1.5 rounded-full border px-5 py-2 text-sm transition-colors ${
          favorited
            ? 'border-amber-400 bg-amber-50 text-amber-600'
            : 'border-gray-200 text-gray-600 hover:border-amber-300 hover:text-amber-600'
        }`}
      >
        <span aria-hidden>{favorited ? '★' : '☆'}</span>
        {favorited ? '已收藏' : '收藏'}
      </button>
    </div>
  );
}
