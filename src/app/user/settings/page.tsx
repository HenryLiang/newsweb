import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { SettingsForm } from '@/components/user/SettingsForm';

// 私有页面:按会话渲染,不走 ISR 缓存
export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: '账号设置' };

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) redirect('/');

  return (
    <div className="mx-auto max-w-[900px]">
      <div className="rounded bg-white px-5 py-4 md:px-8">
        <h1 className="border-b border-gray-100 pb-3 text-lg font-bold">账号设置</h1>
        <div className="py-5">
          <SettingsForm
            email={user.email}
            nickname={user.nickname}
            hasPassword={Boolean(user.passwordHash)}
          />
        </div>
      </div>
    </div>
  );
}
