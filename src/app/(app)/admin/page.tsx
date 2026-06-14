// 管理员后台首页：概览数据
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminHome() {
  const [userCount, postCount, imageCount, recentPosts] = await Promise.all([
    prisma.user.count(),
    prisma.post.count({ where: { isDeleted: false } }),
    prisma.postImage.count(),
    prisma.post.findMany({
      where: { isDeleted: false },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      include: { platform: true, author: true },
    }),
  ]);

  const stats = [
    { label: '代理账号', value: userCount, href: '/admin/users', emoji: '👥' },
    { label: '文案总数', value: postCount, href: '/admin/posts', emoji: '📝' },
    { label: '图片素材', value: imageCount, href: '/admin/posts', emoji: '🖼' },
  ];

  return (
    <div>
      <div className="mb-5">
        <p className="text-xs font-black uppercase tracking-wider text-primary">Admin</p>
        <h1 className="text-2xl font-black mt-1 mb-1">管理员后台</h1>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="bg-white border border-line rounded-[18px] p-4 hover:border-primary hover:shadow-sm transition">
            <p className="text-2xl m-0">{s.emoji}</p>
            <p className="text-2xl font-black m-0 mt-1">{s.value}</p>
            <p className="text-xs text-muted m-0 mt-0.5">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="bg-white border border-line rounded-[18px] p-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-black m-0">最近更新</h2>
          <Link href="/admin/posts" className="text-sm text-primary hover:underline">查看全部 →</Link>
        </div>
        {recentPosts.length === 0 ? (
          <p className="text-sm text-muted m-0">还没有文案 · <Link href="/admin/posts/new/edit" className="text-primary hover:underline">立即新建</Link></p>
        ) : (
          <ul className="space-y-2">
            {recentPosts.map((p) => (
              <li key={p.id}>
                <Link href={`/admin/posts/${p.id}/edit`} className="flex items-center justify-between gap-2 px-3 py-2 rounded-sm hover:bg-soft-2 transition">
                  <div className="flex items-center gap-2 min-w-0">
                    <span>{p.platform.emoji}</span>
                    <span className="font-bold truncate">{p.title}</span>
                  </div>
                  <span className="text-[10px] text-muted shrink-0">
                    {new Date(p.updatedAt).toLocaleString('zh-CN')}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Link
        href="/admin/posts/new/edit"
        className="block text-center py-3 bg-gradient-to-br from-primary to-primary-deep text-white font-bold rounded-[18px] shadow-warm hover:shadow-lg transition"
      >
        + 新建文案
      </Link>
    </div>
  );
}
