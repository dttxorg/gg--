// 登录页
'use client';
import { Suspense, useState, useTransition } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get('from') || '';
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [pending, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    startTransition(async () => {
      const res = await signIn('credentials', {
        username, password, redirect: false,
      });
      if (res?.error) {
        setErr('用户名或密码错误');
        return;
      }
      router.push(from || '/');
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-bold text-muted mb-1.5">用户名</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          required
          className="w-full px-4 py-2.5 border border-line rounded-sm bg-paper-2 focus:border-primary focus:bg-white outline-none transition"
        />
      </div>
      <div>
        <label className="block text-xs font-bold text-muted mb-1.5">密码</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
          className="w-full px-4 py-2.5 border border-line rounded-sm bg-paper-2 focus:border-primary focus:bg-white outline-none transition"
        />
      </div>

      {err && <p className="text-sm text-accent bg-soft border border-accent/20 px-3 py-2 rounded-sm">{err}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full py-3 bg-gradient-to-br from-primary to-primary-deep text-white font-bold rounded-sm hover:shadow-warm transition disabled:opacity-60"
      >
        {pending ? '登录中…' : '登录'}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-[22px] shadow-lg border border-line p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary-deep grid place-items-center text-white font-black text-lg">
            G
          </div>
          <div>
            <h1 className="text-xl font-black m-0 leading-tight">giffgaff 代理资料库</h1>
            <p className="text-xs text-muted m-0 mt-1">内部使用 · 请用代理账号登录</p>
          </div>
        </div>

        <Suspense fallback={<div className="py-8 text-center text-muted text-sm">加载中…</div>}>
          <LoginForm />
        </Suspense>

        <p className="text-xs text-muted mt-6 text-center">
          没有账号？联系你的上级代理开通。
        </p>
      </div>
    </main>
  );
}
