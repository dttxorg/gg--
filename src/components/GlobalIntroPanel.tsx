import Link from 'next/link';
import { sanitizeContentHtml } from '@/lib/sanitize';

interface GlobalIntroPanelProps {
  intro: {
    title: string;
    summary: string | null;
    contentHtml: string;
    isPublished: boolean;
    updatedAt?: Date;
  } | null;
  admin?: boolean;
}

export default function GlobalIntroPanel({ intro, admin = false }: GlobalIntroPanelProps) {
  if (!intro) return null;
  if (!admin && !intro.isPublished) return null;
  const contentHtml = sanitizeContentHtml(intro.contentHtml);

  return (
    <details className="group bg-white border border-line rounded-[18px] mb-5 shadow-sm overflow-hidden">
      <summary className="list-none cursor-pointer px-4 sm:px-5 py-4 hover:bg-soft-2 transition">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-[10px] px-2 py-0.5 bg-primary text-white rounded-full font-black">置顶</span>
              {!intro.isPublished && (
                <span className="text-[10px] px-2 py-0.5 bg-paper-2 border border-line text-muted rounded-full font-bold">
                  未发布
                </span>
              )}
              <h2 className="text-base sm:text-lg font-black m-0">{intro.title}</h2>
            </div>
            {intro.summary && <p className="text-sm text-muted m-0 line-clamp-2">{intro.summary}</p>}
          </div>
          <div className="shrink-0 flex items-center gap-2">
            {admin && (
              <Link
                href="/admin/guide"
                className="hidden sm:inline-flex px-3 py-1.5 text-xs font-bold text-primary bg-paper-2 border border-line rounded-full hover:bg-primary hover:text-white transition"
              >
                编辑
              </Link>
            )}
            <span className="text-xs font-bold text-muted group-open:hidden">展开</span>
            <span className="text-xs font-bold text-muted hidden group-open:inline">收起</span>
          </div>
        </div>
      </summary>
      <div className="px-4 sm:px-5 pb-5 border-t border-dashed border-line">
        <div
          className="post-content pt-4"
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
        {admin && (
          <Link
            href="/admin/guide"
            className="sm:hidden inline-flex mt-3 px-3 py-1.5 text-xs font-bold text-primary bg-paper-2 border border-line rounded-full hover:bg-primary hover:text-white transition"
          >
            编辑总体介绍
          </Link>
        )}
      </div>
    </details>
  );
}
