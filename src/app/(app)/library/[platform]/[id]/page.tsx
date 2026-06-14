// 文案详情：渲染富文本 + 复制全文 + 复制图片
import { prisma } from '@/lib/prisma';
import { sanitizeContentHtml } from '@/lib/sanitize';
import { notFound } from 'next/navigation';
import CopyButtons from './CopyButtons';

export const dynamic = 'force-dynamic';

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ platform: string; id: string }>;
}) {
  const { platform: platformSlug, id: postId } = await params;
  const platform = await prisma.platform.findUnique({ where: { slug: platformSlug } });
  if (!platform) notFound();

  const post = await prisma.post.findFirst({
    where: { id: postId, platformId: platform.id, isDeleted: false },
    include: { images: { orderBy: { order: 'asc' } } },
  });
  if (!post) notFound();
  const contentHtml = sanitizeContentHtml(post.contentHtml);

  return (
    <div>
      <nav className="text-sm text-muted mb-3">
        <a href="/library" className="hover:text-primary">资料库</a>
        <span className="mx-1.5">/</span>
        <a href={`/library?platform=${platform.slug}`} className="hover:text-primary">{platform.emoji} {platform.name}</a>
        <span className="mx-1.5">/</span>
        <span>{post.title}</span>
      </nav>

      <article className="bg-white border border-line rounded-[18px] p-5 sm:p-6 shadow-sm">
        <div className="mb-5 pb-5 border-b border-dashed border-line">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h1 className="text-xl sm:text-2xl font-black m-0 flex-1">{post.title}</h1>
            {post.pinned && <span className="text-[10px] px-1.5 py-0.5 bg-accent text-white rounded font-bold shrink-0">置顶</span>}
          </div>
          {post.subtitle && <p className="text-sm text-muted m-0 mb-2">{post.subtitle}</p>}
          {post.tags && (
            <div className="flex flex-wrap gap-1">
              {post.tags.split(',').filter(Boolean).map((t) => (
                <span key={t} className="text-[10px] px-2 py-0.5 bg-paper-2 border border-line rounded-full text-muted">
                  #{t.trim()}
                </span>
              ))}
            </div>
          )}
        </div>

        <div
          className="post-content"
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />

        {post.images.length > 0 && (
          <div className="mt-6 pt-5 border-t border-dashed border-line">
            <p className="text-sm font-bold text-ink-2 mb-3">📎 配图（点击复制到剪贴板）</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {post.images.map((img) => (
                <CopyImage key={img.id} id={img.id} url={img.url} alt={img.alt || post.title} />
              ))}
            </div>
          </div>
        )}

        <CopyButtons text={post.contentText} />
      </article>
    </div>
  );
}

// 客户端组件：复制图片到剪贴板
function CopyImage({ id, url, alt }: { id: string; url: string; alt: string }) {
  // 标记为 client component
  return <CopyImageClient id={id} url={url} alt={alt} />;
}

// 由于服务端组件里不能直接用 onClick，把图片块单独抽 client
import CopyImageClient from './CopyImageClient';
