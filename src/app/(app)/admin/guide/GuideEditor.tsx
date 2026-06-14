'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Heading1, Heading2, Italic, Link as LinkIcon, List, ListOrdered, Quote, Wand2 } from 'lucide-react';

interface GuideEditorProps {
  guide: {
    title: string;
    summary: string;
    contentHtml: string;
    isPublished: boolean;
  };
}

const templateHtml = `
<h2>业务说明</h2>
<p>这里写 giffgaff 代理业务的定位、适合人群、主要卖点和你希望代理统一传达的信息。</p>
<h2>办理流程</h2>
<ol>
  <li>客户确认需求和使用场景。</li>
  <li>根据平台文案选择合适话术，发送办理说明。</li>
  <li>记录订单、物流、激活和售后状态。</li>
</ol>
<h2>注意事项</h2>
<ul>
  <li>涉及价格、实名、活动、时效的信息，发布前先确认最新版本。</li>
  <li>不要在公开文案里暴露后台账号、供应链信息或敏感成本。</li>
  <li>遇到异常订单先收集截图、号码、时间，再统一反馈处理。</li>
</ul>
<h2>常见问题</h2>
<p><strong>Q: 新代理应该先看什么？</strong><br>先看这里的总体介绍，再进入各平台文案，按平台选择能直接复制的内容。</p>
`.trim();

export default function GuideEditor({ guide }: GuideEditorProps) {
  const router = useRouter();
  const [title, setTitle] = useState(guide.title || '总体介绍');
  const [summary, setSummary] = useState(guide.summary || '');
  const [isPublished, setIsPublished] = useState(guide.isPublished);
  const [err, setErr] = useState('');
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder: '写业务说明、常见问题、注意事项…' }),
    ],
    content: guide.contentHtml || templateHtml,
    immediatelyRender: false,
    editorProps: {
      attributes: { class: 'tiptap' },
    },
  });

  async function handleSave() {
    if (!editor) return;
    setErr('');
    setSaved(false);
    if (!title.trim()) {
      setErr('请填写标题');
      return;
    }

    const contentHtml = editor.getHTML();
    const contentText = editor.getText();

    startTransition(async () => {
      const res = await fetch('/api/admin/guide', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, summary, contentHtml, contentText, isPublished }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setErr(j.error || '保存失败');
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-line rounded-[18px] p-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-muted mb-1.5">标题</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-line rounded-sm bg-paper-2 focus:border-primary outline-none text-base font-bold"
              placeholder="总体介绍"
            />
          </div>
          <div className="flex items-end">
            <label className="inline-flex items-center gap-2 cursor-pointer h-10">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm font-bold">在代理资料库显示</span>
            </label>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-muted mb-1.5">折叠状态下摘要</label>
            <input
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full px-3 py-2 border border-line rounded-sm bg-paper-2 focus:border-primary outline-none"
              placeholder="业务说明、常见问题和注意事项集中放在这里。"
            />
          </div>
        </div>
      </div>

      <div className="bg-white border border-line rounded-[18px] p-5">
        <div className="flex items-center justify-between gap-3 mb-2">
          <label className="block text-xs font-bold text-muted">内容</label>
          <button
            type="button"
            onClick={() => editor?.commands.setContent(templateHtml)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full border border-line bg-paper-2 hover:border-primary hover:text-primary transition"
          >
            <Wand2 size={14} />
            生成结构
          </button>
        </div>
        {editor && (
          <div className="border border-line rounded-sm overflow-hidden">
            <div className="flex flex-wrap gap-1 p-2 border-b border-line bg-paper-2">
              <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')}><Bold size={16} /></ToolbarBtn>
              <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')}><Italic size={16} /></ToolbarBtn>
              <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })}><Heading1 size={16} /></ToolbarBtn>
              <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })}><Heading2 size={16} /></ToolbarBtn>
              <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')}><List size={16} /></ToolbarBtn>
              <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')}><ListOrdered size={16} /></ToolbarBtn>
              <ToolbarBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')}><Quote size={16} /></ToolbarBtn>
              <ToolbarBtn
                onClick={() => {
                  const url = prompt('链接 URL');
                  if (url) editor.chain().focus().setLink({ href: url }).run();
                }}
                active={editor.isActive('link')}
              >
                <LinkIcon size={16} />
              </ToolbarBtn>
            </div>
            <EditorContent editor={editor} className="p-4 max-h-[60vh] overflow-y-auto" />
          </div>
        )}
      </div>

      {err && <p className="text-sm text-accent bg-soft border border-accent/20 px-3 py-2 rounded-sm">{err}</p>}
      {saved && <p className="text-sm text-primary bg-paper-2 border border-primary/20 px-3 py-2 rounded-sm">已保存，总体介绍会置顶显示。</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={pending}
          className="flex-1 py-3 bg-gradient-to-br from-primary to-primary-deep text-white font-bold rounded-[18px] hover:shadow-warm transition disabled:opacity-60"
        >
          {pending ? '保存中…' : '保存总体介绍'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/admin/posts')}
          className="px-6 py-3 border border-line rounded-[18px] font-bold hover:bg-soft-2 transition"
        >
          返回
        </button>
      </div>
    </div>
  );
}

function ToolbarBtn({ children, onClick, active }: { children: React.ReactNode; onClick: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'inline-flex items-center justify-center w-8 h-8 rounded transition',
        active ? 'bg-primary text-white' : 'text-ink-2 hover:bg-soft',
      ].join(' ')}
    >
      {children}
    </button>
  );
}
