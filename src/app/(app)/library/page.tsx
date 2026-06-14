// 资料库主页：平台 Tab + 文案列表
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function LibraryPage({ searchParams }: { searchParams: { platform?: string } }) {
  const platforms = await prisma.platform.findMany({
    orderBy: { order: 'asc' },
    include: {
      _count: { select: { posts: { where: { isDeleted: false } } } },
    },
  });

  const activeSlug = searchParams.platform || platforms[0]?.slug || '';
  const activePlatform = platforms.find((p) => p.slug === activeSlug) || platforms[0];

  const posts = activePlatform
    ? await prisma.post.findMany({
        where: { platformId: activePlatform.id, isDeleted: false },
        orderBy: [{ pinned: 'desc' }, { order: 'asc' }, { updatedAt: 'desc' }],
        select: {
          id: true, title: true, subtitle: true, tags: true, pinned: true, updatedAt: true,
          _count: { select: { images: true } },
        },
      })
    : [];

  return (
    <div>
      <div className="mb-5">
        <p className="text-xs font-black uppercase tracking-wider text-primary">Library</p>
        <h1 className="text-2xl font-black mt-1 mb-1">代理资料库</h1>
        <p className="text-sm text-muted">按平台分栏 · 文案可直接复制 · 配图可一键复制到剪贴板</p>
      </div>

      {/* 平台 Tab */}
      <nav className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-6">
        {platforms.map((p) => {
          const active = p.slug === activePlatform?.slug;
          return (
            <Link
              key={p.id}
              href={`/library?platform=${p.slug}`}
              className={[
                'flex flex-col items-center gap-1 px-3 py-3 rounded-[14px] border transition text-center',
                active
                  ? 'bg-primary text-white border-primary shadow-[0_8px_20px_rgba(67,56,202,0.35)]'
                  : 'bg-paper-2 border-line text-ink hover:border-primary hover:bg-white',
              ].join(' ')}
            >
              <span className="text-2xl leading-none">{p.emoji}</span>
              <span className="text-sm font-bold">{p.name}</span>
              <span className={['text-[10px]', active ? 'text-white/80' : 'text-muted'].join(' ')}>
                {p._count.posts} 篇
              </span>
            </Link>
          );
        })}
      </nav>

      {/* 当前平台说明 */}
      {activePlatform && (
        <div className="bg-soft-2 border border-line rounded-[18px] p-4 mb-5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">{activePlatform.emoji}</span>
            <h2 className="text-base font-black m-0">{activePlatform.name}</h2>
          </div>
          {activePlatform.description && (
            <p className="text-sm text-muted m-0">{activePlatform.description}</p>
          )}
        </div>
      )}

      {/* 文案列表 */}
      {posts.length === 0 ? (
        <div className="bg-white border border-line rounded-[18px] p-10 text-center">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-muted">这个平台还没有内容</p>
          <p className="text-xs text-muted mt-1">请联系管理员添加</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {posts.map((post) => (
            <li key={post.id}>
              <Link
                href={`/library/${activePlatform?.slug}/${post.id}`}
                className="block bg-white border border-line rounded-[18px] p-4 hover:border-primary hover:shadow-sm transition group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {post.pinned && <span className="text-[10px] px-1.5 py-0.5 bg-accent text-white rounded font-bold">置顶</span>}
                      <h3 className="text-base font-bold m-0 truncate group-hover:text-primary transition">
                        {post.title}
                      </h3>
                    </div>
                    {post.subtitle && (
                      <p className="text-sm text-muted m-0 line-clamp-1">{post.subtitle}</p>
                    )}
                    {post.tags && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {post.tags.split(',').filter(Boolean).slice(0, 4).map((t) => (
                          <span key={t} className="text-[10px] px-2 py-0.5 bg-paper-2 border border-line rounded-full text-muted">
                            #{t.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    {post._count.images > 0 && (
                      <p className="text-[10px] text-muted">📷 {post._count.images}</p>
                    )}
                    <p className="text-[10px] text-muted mt-1">
                      {new Date(post.updatedAt).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
