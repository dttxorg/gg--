'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, List, ListOrdered, Quote, Image as ImageIcon, Link as LinkIcon, Heading1, Heading2 } from 'lucide-react';

interface Props {
  isNew: boolean;
  platforms: { id: string; name: string; emoji: string; slug: string }[];
  post: null | {
    id: string;
    platformId: string;
    title: string;
    subtitle: string;
    tags: string;
    contentHtml: string;
    contentText: string;
    pinned: boolean;
    order: number;
    images: { id: string; url: string; filename: string }[];
  };
}

export default function PostEditor({ isNew, platforms, post }: Props) {
  const router = useRouter();
  const [platformId, setPlatformId] = useState(post?.platformId || platforms[0]?.id || '');
  const [title, setTitle] = useState(post?.title || '');
  const [subtitle, setSubtitle] = useState(post?.subtitle || '');
  const [tags, setTags] = useState(post?.tags || '');
  const [pinned, setPinned] = useState(post?.pinned || false);
  const [order, setOrder] = useState(post?.order ?? 0);
  const [images, setImages] = useState(post?.images || []);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: false, allowBase64: false }),
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder: '开始写文案…' }),
    ],
    content: post?.contentHtml || '',
    immediatelyRender: false,
    editorProps: {
      attributes: { class: 'tiptap' },
    },
  });

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setErr('');
    try {
      for (const file of Array.from(files)) {
        if (file.size > 8 * 1024 * 1024) {
          setErr(`图片 ${file.name} 超过 8MB`);
          continue;
        }
        const fd = new FormData();
        fd.append('file', file);
        if (post?.id) fd.append('postId', post.id);
        const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          setErr(j.error || '上传失败');
          continue;
        }
        const data = await res.json();
        setImages((prev) => [...prev, { id: data.id, url: data.url, filename: data.filename }]);
        // 自动插入到编辑器末尾
        editor?.chain().focus().setImage({ src: data.url, alt: file.name }).run();
      }
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!editor) return;
    setErr('');
    if (!title.trim()) { setErr('请填写标题'); return; }
    if (!platformId) { setErr('请选择平台'); return; }

    const contentHtml = editor.getHTML();
    const contentText = editor.getText();

    const body = { platformId, title, subtitle, tags, contentHtml, contentText, pinned, order };
    const url = isNew ? '/api/admin/posts' : `/api/admin/posts/${post!.id}`;
    const method = isNew ? 'POST' : 'PUT';

    startTransition(async () => {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setErr(j.error || '保存失败');
        return;
      }
      const data = await res.json();
      router.push(`/admin/posts/${data.id}/edit`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-line rounded-[18px] p-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-muted mb-1.5">平台</label>
            <select
              value={platformId}
              onChange={(e) => setPlatformId(e.target.value)}
              className="w-full px-3 py-2 border border-line rounded-sm bg-paper-2 focus:border-primary outline-none"
            >
              {platforms.map((p) => (
                <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-muted mb-1.5">标签（逗号分隔）</label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="种草,教程,爆款"
              className="w-full px-3 py-2 border border-line rounded-sm bg-paper-2 focus:border-primary outline-none"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-muted mb-1.5">标题 *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="如：来英国第一周必办的 5 件事"
              className="w-full px-3 py-2 border border-line rounded-sm bg-paper-2 focus:border-primary outline-none text-base font-bold"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-muted mb-1.5">副标题 / 场景说明</label>
            <input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="如：科普向 · 高收藏率"
              className="w-full px-3 py-2 border border-line rounded-sm bg-paper-2 focus:border-primary outline-none"
            />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} className="w-4 h-4" />
              <span className="text-sm font-bold">置顶</span>
            </label>
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-muted">排序权重</label>
              <input
                type="number"
                value={order}
                onChange={(e) => setOrder(parseInt(e.target.value || '0'))}
                className="w-20 px-2 py-1 border border-line rounded-sm text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 编辑器 */}
      <div className="bg-white border border-line rounded-[18px] p-5">
        <label className="block text-xs font-bold text-muted mb-2">正文（富文本）</label>
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
              <label className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold rounded hover:bg-soft cursor-pointer">
                <ImageIcon size={16} />
                <span>插入图片</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleUpload(e.target.files)}
                  disabled={uploading}
                />
              </label>
              {uploading && <span className="text-xs text-muted self-center ml-2">上传中…</span>}
            </div>
            <EditorContent editor={editor} className="p-4 max-h-[60vh] overflow-y-auto" />
          </div>
        )}
      </div>

      {/* 已上传图片 */}
      {images.length > 0 && (
        <div className="bg-white border border-line rounded-[18px] p-5">
          <label className="block text-xs font-bold text-muted mb-2">配图库（{images.length} 张）</label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {images.map((img) => (
              <div key={img.id} className="relative group rounded overflow-hidden border border-line">
                <img src={img.url} alt={img.filename} className="w-full h-auto" />
                <button
                  type="button"
                  onClick={async () => {
                    if (!confirm('删除这张图？')) return;
                    const res = await fetch(`/api/admin/images/${img.id}`, { method: 'DELETE' });
                    if (res.ok) setImages((p) => p.filter((x) => x.id !== img.id));
                  }}
                  className="absolute top-1 right-1 bg-accent text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {err && <p className="text-sm text-accent bg-soft border border-accent/20 px-3 py-2 rounded-sm">{err}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={pending}
          className="flex-1 py-3 bg-gradient-to-br from-primary to-primary-deep text-white font-bold rounded-[18px] hover:shadow-warm transition disabled:opacity-60"
        >
          {pending ? '保存中…' : isNew ? '创建文案' : '保存修改'}
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
