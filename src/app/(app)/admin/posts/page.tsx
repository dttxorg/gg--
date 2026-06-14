// 文案列表（管理端）
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminPostsPage({ searchParams }: { searchParams: Promise<{ platform?: string }> }) {
  const { platform } = await searchParams;
  const platforms = await prisma.platform.findMany({ orderBy: { order: 'asc' } });
  const activeSlug = platform || '';

  const where: any = { isDeleted: false };
  if (activeSlug) where.platform = { slug: activeSlug };

  const posts = await prisma.post.findMany({
    where,
    orderBy: [{ pinned: 'desc' }, { updatedAt: 'desc' }],
    include: { platform: true, _count: { select: { images: true } } },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-primary">Posts</p>
          <h1 className="text-2xl font-black mt-1 mb-1">文案管理</h1>
        </div>
        <Link
          href="/admin/posts/new"
          className="px-5 py-2.5 bg-primary text-white font-bold rounded-full shadow-sm hover:bg-primary-dark transition"
        >
          + 新建
        </Link>
      </div>

      {/* 平台筛选 */}
      <div className="flex flex-wrap gap-2 mb-5">
        <Link
          href="/admin/posts"
          className={[
            'px-3 py-1.5 rounded-full text-sm font-bold border transition',
            !activeSlug ? 'bg-primary text-white border-primary' : 'bg-white border-line text-ink-2 hover:border-primary',
          ].join(' ')}
        >
          全部
        </Link>
        {platforms.map((p) => (
          <Link
            key={p.id}
            href={`/admin/posts?platform=${p.slug}`}
            className={[
              'px-3 py-1.5 rounded-full text-sm font-bold border transition',
              activeSlug === p.slug ? 'bg-primary text-white border-primary' : 'bg-white border-line text-ink-2 hover:border-primary',
            ].join(' ')}
          >
            {p.emoji} {p.name}
          </Link>
        ))}
      </div>

      {posts.length === 0 ? (
        <div className="bg-white border border-line rounded-[18px] p-10 text-center">
          <p className="text-muted m-0">还没有文案</p>
        </div>
      ) : (
        <div className="bg-white border border-line rounded-[18px] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-paper-2 text-xs text-muted">
              <tr>
                <th className="text-left px-4 py-2.5 font-bold">标题</th>
                <th className="text-left px-4 py-2.5 font-bold hidden sm:table-cell">平台</th>
                <th className="text-left px-4 py-2.5 font-bold hidden md:table-cell">图片</th>
                <th className="text-left px-4 py-2.5 font-bold hidden md:table-cell">更新</th>
                <th className="text-right px-4 py-2.5 font-bold">操作</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id} className="border-t border-line hover:bg-soft-2 transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {p.pinned && <span className="text-[10px] px-1.5 py-0.5 bg-accent text-white rounded font-bold">置顶</span>}
                      <span className="font-bold">{p.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-xs text-muted">
                    {p.platform.emoji} {p.platform.name}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs text-muted">{p._count.images}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs text-muted">
                    {new Date(p.updatedAt).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1.5">
                      <Link href={`/admin/posts/${p.id}/edit`} className="px-2.5 py-1 text-xs font-bold text-primary bg-paper-2 border border-line rounded-full hover:bg-primary hover:text-white transition">
                        编辑
                      </Link>
                      <DeletePostButton id={p.id} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DeletePostButton({ id }: { id: string }) {
  return <DeletePostButtonClient id={id} />;
}

import DeletePostButtonClient from './DeletePostButtonClient';
