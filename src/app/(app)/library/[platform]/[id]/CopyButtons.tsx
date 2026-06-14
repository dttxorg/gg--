'use client';
import { useState } from 'react';

export default function CopyButtons({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // 兜底
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); setCopied(true); setTimeout(() => setCopied(false), 1800); }
      catch {}
      document.body.removeChild(ta);
    }
  }

  return (
    <div className="mt-6 pt-5 border-t border-dashed border-line flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={copy}
        className={[
          'inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm transition shadow-sm',
          copied
            ? 'bg-green-500 text-white'
            : 'bg-primary text-white hover:bg-primary-dark hover:shadow-warm',
        ].join(' ')}
      >
        {copied ? '✅ 已复制全文到剪贴板' : '📋 复制全文（纯文本）'}
      </button>
      <span className="text-xs text-muted">复制后可直接粘贴到小红书 / 抖音 / 头条 / 微博编辑器</span>
    </div>
  );
}
