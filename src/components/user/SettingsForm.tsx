'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface SettingsFormProps {
  email: string;
  nickname: string;
  hasPassword: boolean;
}

/** 账号设置表单:修改昵称 + 设置/修改密码 */
export function SettingsForm({ email, nickname, hasPassword }: SettingsFormProps) {
  const [name, setName] = useState(nickname);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nameMsg, setNameMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function saveNickname() {
    if (pending) return;
    setPending(true);
    setNameMsg(null);
    try {
      const res = await fetch('/api/account/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: name }),
      });
      const data = await res.json();
      setNameMsg(
        res.ok
          ? { ok: true, text: '昵称已更新' }
          : { ok: false, text: data.error ?? '保存失败' },
      );
      if (res.ok) router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function savePassword() {
    if (pending) return;
    setPwMsg(null);
    if (newPassword !== confirmPassword) {
      setPwMsg({ ok: false, text: '两次输入的密码不一致' });
      return;
    }
    setPending(true);
    try {
      const res = await fetch('/api/account/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: newPassword,
          currentPassword: hasPassword ? currentPassword : undefined,
        }),
      });
      const data = await res.json();
      setPwMsg(
        res.ok
          ? { ok: true, text: hasPassword ? '密码已修改' : '密码已设置,下次可用密码登录' }
          : { ok: false, text: data.error ?? '保存失败' },
      );
      if (res.ok) {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* 基本信息 */}
      <section>
        <h2 className="mb-3 text-[15px] font-semibold">基本信息</h2>
        <label className="mb-1 block text-sm text-gray-600">邮箱</label>
        <input
          type="email"
          value={email}
          disabled
          className="mb-3 w-full max-w-sm rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-400"
        />
        <label className="mb-1 block text-sm text-gray-600">昵称</label>
        <div className="flex max-w-sm gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            className="min-w-0 flex-1 rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
          />
          <button
            type="button"
            onClick={saveNickname}
            disabled={pending || !name.trim() || name === nickname}
            className="shrink-0 rounded bg-[var(--brand)] px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            保存
          </button>
        </div>
        {nameMsg && (
          <p className={`mt-2 text-xs ${nameMsg.ok ? 'text-green-600' : 'text-red-500'}`}>
            {nameMsg.text}
          </p>
        )}
      </section>

      {/* 密码 */}
      <section>
        <h2 className="mb-3 text-[15px] font-semibold">
          {hasPassword ? '修改密码' : '设置密码'}
        </h2>
        <div className="max-w-sm space-y-3">
          {hasPassword && (
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="当前密码"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
            />
          )}
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="新密码(8-64 位,含字母和数字)"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="确认新密码"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
          />
          <button
            type="button"
            onClick={savePassword}
            disabled={pending || !newPassword || (hasPassword && !currentPassword)}
            className="rounded bg-[var(--brand)] px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {hasPassword ? '修改密码' : '设置密码'}
          </button>
          {pwMsg && (
            <p className={`text-xs ${pwMsg.ok ? 'text-green-600' : 'text-red-500'}`}>
              {pwMsg.text}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
