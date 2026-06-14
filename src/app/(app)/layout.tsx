// 公共布局：左侧导航 + 顶部条
import { auth, signOut } from '@/lib/auth';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect('/login');
  const isAdmin = session.user.role === 'ADMIN';

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 bg-paper/90 backdrop-blur border-b border-line">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Link href={isAdmin ? '/admin' : '/library'} className="flex items-center gap-2 no-underline">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary-deep grid place-items-center text-white font-black">
              G
            </div>
            <div>
              <p className="text-sm font-black leading-none">giffgaff 代理资料库</p>
              <p className="text-[10px] text-muted mt-0.5 leading-none">
                {isAdmin ? '管理员后台' : '代理资料'}
              </p>
            </div>
          </Link>

          <nav className="flex items-center gap-1 sm:gap-2 text-sm">
            {!isAdmin && (
              <Link href="/library" className="px-3 py-1.5 rounded-full text-ink-2 hover:bg-soft-2 transition">
                资料库
              </Link>
            )}
            {isAdmin && (
              <>
                <Link href="/admin" className="px-3 py-1.5 rounded-full text-ink-2 hover:bg-soft-2 transition">
                  概览
                </Link>
                <Link href="/admin/posts" className="px-3 py-1.5 rounded-full text-ink-2 hover:bg-soft-2 transition">
                  文案
                </Link>
                <Link href="/admin/users" className="px-3 py-1.5 rounded-full text-ink-2 hover:bg-soft-2 transition">
                  账号
                </Link>
              </>
            )}
            <span className="hidden sm:inline-block px-3 py-1 text-xs text-muted">
              {session.user.displayName}
            </span>
            <form action={async () => {
              'use server';
              await signOut({ redirectTo: '/login' });
            }}>
              <button type="submit" className="px-3 py-1.5 rounded-full text-sm text-accent hover:bg-soft transition">
                退出
              </button>
            </form>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">{children}</main>

      <footer className="border-t border-line py-4 text-center text-xs text-muted">
        © giffgaff 代理资料库 · 内部使用
      </footer>
    </div>
  );
}
