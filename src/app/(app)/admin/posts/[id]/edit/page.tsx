// 新建/编辑文案
import { prisma } from '@/lib/prisma';
import PostEditor from './PostEditor';

export const dynamic = 'force-dynamic';

export default async function EditPostPage({ params }: { params: { id: string } }) {
  const isNew = params.id === 'new';
  const platforms = await prisma.platform.findMany({ orderBy: { order: 'asc' } });
  let post: any = null;
  if (!isNew) {
    post = await prisma.post.findUnique({
      where: { id: params.id },
      include: { images: { orderBy: { order: 'asc' } } },
    });
    if (!post) return <div className="p-10 text-center text-muted">文案不存在</div>;
  }

  return (
    <div>
      <nav className="text-sm text-muted mb-3">
        <a href="/admin/posts" className="hover:text-primary">文案</a>
        <span className="mx-1.5">/</span>
        <span>{isNew ? '新建' : '编辑'}</span>
      </nav>

      <PostEditor
        isNew={isNew}
        platforms={platforms.map((p) => ({ id: p.id, name: p.name, emoji: p.emoji, slug: p.slug }))}
        post={post ? {
          id: post.id,
          platformId: post.platformId,
          title: post.title,
          subtitle: post.subtitle || '',
          tags: post.tags || '',
          contentHtml: post.contentHtml,
          contentText: post.contentText,
          pinned: post.pinned,
          order: post.order,
          images: post.images.map((i: any) => ({ id: i.id, url: i.url, filename: i.filename })),
        } : null}
      />
    </div>
  );
}
