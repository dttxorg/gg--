import { prisma } from '@/lib/prisma';
import GuideEditor from './GuideEditor';

export const dynamic = 'force-dynamic';

const fallbackGuide = {
  title: '总体介绍',
  summary: '业务说明、常见问题和注意事项集中放在这里。',
  contentHtml: '<h2>业务说明</h2><p>这里可以放 giffgaff 代理业务的整体介绍、适合人群、办理流程和常用话术。</p><h2>注意事项</h2><p>涉及价格、活动、实名和时效的信息，发布前请先确认是否为最新版本。</p>',
  isPublished: true,
};

export default async function AdminGuidePage() {
  const guide = await prisma.globalIntro.findUnique({ where: { key: 'main' } });

  return (
    <div>
      <nav className="text-sm text-muted mb-3">
        <a href="/admin/posts" className="hover:text-primary">文案</a>
        <span className="mx-1.5">/</span>
        <span>总体介绍</span>
      </nav>

      <div className="mb-5">
        <p className="text-xs font-black uppercase tracking-wider text-primary">Pinned guide</p>
        <h1 className="text-2xl font-black mt-1 mb-1">总体介绍</h1>
        <p className="text-sm text-muted">这块内容会置顶在资料库和文案管理上方，默认折叠。</p>
      </div>

      <GuideEditor
        guide={{
          title: guide?.title || fallbackGuide.title,
          summary: guide?.summary || fallbackGuide.summary,
          contentHtml: guide?.contentHtml || fallbackGuide.contentHtml,
          isPublished: guide?.isPublished ?? fallbackGuide.isPublished,
        }}
      />
    </div>
  );
}
