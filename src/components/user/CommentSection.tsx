'use client';

import { useCallback, useEffect, useState } from 'react';
import { dispatchOpenLogin } from './UserMenu';
import { timeAgo } from '@/lib/format';

interface CommentItem {
  id: string;
  parentId: string | null;
  content: string;
  createdAt: string;
  author: string;
  avatarUrl: string | null;
  authorId: string;
}

interface CommentSectionProps {
  articleId: string;
}

/**
 * 评论区:列表 + 发表 + 一级回复。挂载后客户端拉取,不影响文章页 ISR。
 * 提交结果按审核状态提示:已发布 / 待审核 / 未通过。
 */
export function CommentSection({ articleId }: CommentSectionProps) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [content, setContent] = useState('');
  const [replyTo, setReplyTo] = useState<CommentItem | null>(null);
  const [notice, setNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // undefined=登录态未确认,null=确认未登录;避免未确认时误弹登录框
  const [myId, setMyId] = useState<string | null | undefined>(undefined);

  const load = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/comments?articleId=${encodeURIComponent(articleId)}`,
      );
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments ?? []);
      }
    } catch {
      /* 评论区加载失败静默 */
    } finally {
      setLoaded(true);
    }
  }, [articleId]);

  useEffect(() => {
    load();
    fetch('/api/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setMyId(d?.user?.id ?? null))
      .catch(() => {});
  }, [load]);

  async function submit() {
    const text = content.trim();
    if (!text || submitting) return;
    setSubmitting(true);
    setNotice(null);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId,
          content: text,
          parentId: replyTo?.id,
        }),
      });
      const data = await res.json();
      if (res.status === 401) {
        dispatchOpenLogin();
        return;
      }
      if (!res.ok) {
        setNotice({ type: 'err', text: data.error ?? '发表失败' });
        return;
      }
      setNotice({
        type: data.status === 'rejected' ? 'err' : 'ok',
        text: data.message,
      });
      setContent('');
      setReplyTo(null);
      if (data.status === 'published') await load();
    } catch {
      setNotice({ type: 'err', text: '网络异常,请稍后再试' });
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/comments/${id}`, { method: 'DELETE' });
    if (res.ok) await load();
  }

  const topLevel = comments.filter((c) => !c.parentId);
  const repliesOf = (id: string) => comments.filter((c) => c.parentId === id);

  function renderComment(c: CommentItem, isReply = false) {
    return (
      <li key={c.id} className={isReply ? 'ml-10 border-l-2 border-gray-100 pl-3' : ''}>
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-gray-700">{c.author}</span>
          <span className="text-xs text-gray-400">{timeAgo(c.createdAt)}</span>
          <span className="ml-auto flex gap-2 text-xs">
            <button
              type="button"
              onClick={() => setReplyTo(c)}
              className="text-gray-400 hover:text-[var(--brand)]"
            >
              回复
            </button>
            {myId === c.authorId && (
              <button
                type="button"
                onClick={() => remove(c.id)}
                className="text-gray-400 hover:text-red-500"
              >
                删除
              </button>
            )}
          </span>
        </div>
        <p className="mt-1 whitespace-pre-wrap break-words text-[15px] text-gray-800">
          {c.content}
        </p>
      </li>
    );
  }

  return (
    <section className="mt-4 rounded bg-white p-5 md:p-8">
      <h2 className="border-b border-gray-100 pb-3 text-[17px] font-semibold">
        <span className="border-l-4 border-[var(--brand)] pl-2">
          评论 {loaded && comments.length > 0 ? `(${comments.length})` : ''}
        </span>
      </h2>

      {/* 发表框 */}
      <div className="mt-4">
        {replyTo && (
          <p className="mb-2 flex items-center gap-2 rounded bg-gray-50 px-3 py-1.5 text-xs text-gray-500">
            回复 {replyTo.author}：{replyTo.content.slice(0, 30)}
            {replyTo.content.length > 30 ? '…' : ''}
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              className="ml-auto text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </p>
        )}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder={myId === null ? '登录后参与评论' : '写下你的评论…'}
          onFocus={() => {
            if (myId === null) dispatchOpenLogin();
          }}
          className="w-full resize-y rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
        />
        <div className="mt-2 flex items-center gap-3">
          <span className="text-xs text-gray-400">{content.length}/500</span>
          {notice && (
            <span
              className={`text-xs ${notice.type === 'ok' ? 'text-green-600' : 'text-red-500'}`}
            >
              {notice.text}
            </span>
          )}
          <button
            type="button"
            onClick={submit}
            disabled={submitting || !content.trim()}
            className="ml-auto rounded bg-[var(--brand)] px-5 py-1.5 text-sm text-white disabled:opacity-50"
          >
            {submitting ? '审核中…' : '发表'}
          </button>
        </div>
      </div>

      {/* 列表 */}
      {loaded && topLevel.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-400">
          还没有评论,来抢沙发
        </p>
      ) : (
        <ul className="mt-4 space-y-4">
          {topLevel.map((c) => (
            <li key={c.id}>
              <ul className="space-y-4">
                {renderComment(c)}
                {repliesOf(c.id).map((r) => renderComment(r, true))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
