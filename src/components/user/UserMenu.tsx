'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';

interface SessionUser {
  id: string;
  email: string;
  nickname: string;
  avatarUrl: string | null;
  role: string;
}

/** 其他组件（如文章互动区）通过该事件要求打开登录框 */
export const OPEN_LOGIN_EVENT = 'open-login';

export function dispatchOpenLogin() {
  window.dispatchEvent(new CustomEvent(OPEN_LOGIN_EVENT));
}

/**
 * 顶栏用户菜单:未登录显示"登录"按钮(弹验证码登录框),已登录显示昵称+下拉。
 * 登录/登出成功后刷新页面,让服务端组件按新会话渲染。
 */
export function UserMenu() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // 登录框状态
  const [mode, setMode] = useState<'code' | 'password'>('code');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadMe = useCallback(async () => {
    try {
      const res = await fetch('/api/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadMe();
    const open = () => setDialogOpen(true);
    window.addEventListener(OPEN_LOGIN_EVENT, open);
    return () => window.removeEventListener(OPEN_LOGIN_EVENT, open);
  }, [loadMe]);

  // 重发倒计时
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // 点击下拉外部时收起
  useEffect(() => {
    if (!dropdownOpen) return;
    const onClick = (e: MouseEvent) => {
      if (!dropdownRef.current?.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [dropdownOpen]);

  async function sendCode() {
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? '发送失败');
        return;
      }
      setCodeSent(true);
      setCountdown(60);
    } catch {
      setError('网络异常,请稍后再试');
    } finally {
      setSubmitting(false);
    }
  }

  async function verify() {
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? '登录失败');
        return;
      }
      await afterLogin();
    } catch {
      setError('网络异常,请稍后再试');
    } finally {
      setSubmitting(false);
    }
  }

  /** 登录成功后的统一收尾:同步本地浏览历史,再整页刷新 */
  async function afterLogin() {
    setDialogOpen(false);
    const { syncLocalHistoryToServer } = await import('@/lib/history');
    await syncLocalHistoryToServer();
    window.location.reload();
  }

  async function loginWithPassword() {
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/login-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? '登录失败');
        return;
      }
      await afterLogin();
    } catch {
      setError('网络异常,请稍后再试');
    } finally {
      setSubmitting(false);
    }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.reload();
  }

  if (!loaded) {
    // 占位避免布局跳动
    return <div className="h-8 w-14" />;
  }

  return (
    <>
      {user ? (
        <div ref={dropdownRef} className="relative">
          <button
            type="button"
            onClick={() => setDropdownOpen((v) => !v)}
            className="flex items-center gap-1 rounded px-2 py-1 text-sm text-white hover:bg-white/10"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-xs">
              {user.nickname.slice(0, 1)}
            </span>
            <span className="hidden max-w-20 truncate md:inline">
              {user.nickname}
            </span>
          </button>
          {dropdownOpen && (
            <div className="absolute right-0 top-full z-50 mt-1 w-32 rounded bg-white py-1 text-sm shadow-lg ring-1 ring-black/5">
              <Link
                href="/user/feed"
                className="block px-3 py-2 text-gray-700 hover:bg-gray-50"
                onClick={() => setDropdownOpen(false)}
              >
                我的订阅
              </Link>
              <Link
                href="/user/favorites"
                className="block px-3 py-2 text-gray-700 hover:bg-gray-50"
                onClick={() => setDropdownOpen(false)}
              >
                我的收藏
              </Link>
              <Link
                href="/user/history"
                className="block px-3 py-2 text-gray-700 hover:bg-gray-50"
                onClick={() => setDropdownOpen(false)}
              >
                浏览历史
              </Link>
              <Link
                href="/user/settings"
                className="block px-3 py-2 text-gray-700 hover:bg-gray-50"
                onClick={() => setDropdownOpen(false)}
              >
                账号设置
              </Link>
              {user.role === 'admin' && (
                <Link
                  href="/admin/comments"
                  className="block px-3 py-2 text-gray-700 hover:bg-gray-50"
                  onClick={() => setDropdownOpen(false)}
                >
                  评论审核
                </Link>
              )}
              <button
                type="button"
                onClick={logout}
                className="block w-full px-3 py-2 text-left text-gray-700 hover:bg-gray-50"
              >
                退出登录
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="rounded bg-white/15 px-3 py-1.5 text-sm text-white hover:bg-white/25"
        >
          登录
        </button>
      )}

      {dialogOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setDialogOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-lg bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-1 text-lg font-bold">登录</h2>
            <div className="mb-4 flex gap-4 border-b border-gray-100">
              {(
                [
                  { key: 'code', label: '验证码登录' },
                  { key: 'password', label: '密码登录' },
                ] as const
              ).map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => {
                    setMode(t.key);
                    setError('');
                  }}
                  className={`border-b-2 px-1 pb-2 text-sm ${
                    mode === t.key
                      ? 'border-[var(--brand)] font-medium text-[var(--brand)]'
                      : 'border-transparent text-gray-500'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <label className="mb-1 block text-sm text-gray-600">邮箱</label>
            <div className="mb-3 flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="min-w-0 flex-1 rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
              />
              {mode === 'code' && (
                <button
                  type="button"
                  onClick={sendCode}
                  disabled={submitting || countdown > 0 || !email}
                  className="shrink-0 rounded bg-[var(--brand)] px-3 py-2 text-sm text-white disabled:opacity-50"
                >
                  {countdown > 0 ? `${countdown}s` : codeSent ? '重发' : '发送验证码'}
                </button>
              )}
            </div>

            {mode === 'code' ? (
              <>
                <label className="mb-1 block text-sm text-gray-600">验证码</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="6 位数字"
                  className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm tracking-widest outline-none focus:border-[var(--brand)]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && code.length === 6) verify();
                  }}
                />
                <p className="mb-3 text-xs text-gray-400">
                  未注册的邮箱验证后将自动创建账号
                </p>
              </>
            ) : (
              <>
                <label className="mb-1 block text-sm text-gray-600">密码</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="账号密码"
                  className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && password) loginWithPassword();
                  }}
                />
                <p className="mb-3 text-xs text-gray-400">
                  忘记密码或未设置过密码?用验证码登录后可在账号设置中设置
                </p>
              </>
            )}

            {error && <p className="mb-3 text-sm text-red-500">{error}</p>}

            <button
              type="button"
              onClick={mode === 'code' ? verify : loginWithPassword}
              disabled={
                submitting ||
                (mode === 'code' ? code.length !== 6 : !password || !email)
              }
              className="w-full rounded bg-[var(--brand)] py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {submitting ? '请稍候…' : '登录'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
