'use client';
import { useState } from 'react';

export default function CopyImageClient({ url, alt }: { url: string; alt: string }) {
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState('');

  async function handleCopy() {
    setErr('');
    try {
      // 1) 拉图片转 Blob
      const res = await fetch(url, { mode: 'cors' });
      if (!res.ok) throw new Error('fetch failed');
      const blob = await res.blob();

      // 2) 优先用 ClipboardItem API（需要 HTTPS / localhost）
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({ [blob.type]: blob }),
        ]);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
        return;
      }
      throw new Error('浏览器不支持图片复制');
    } catch (e: any) {
      setErr(e?.message || '复制失败');
    }
  }

  return (
    <div className="relative group">
      <button
        type="button"
        onClick={handleCopy}
        className="block w-full text-left rounded-[12px] overflow-hidden border border-line hover:border-primary transition bg-paper-2"
      >
        <img src={url} alt={alt} className="w-full h-auto block" loading="lazy" />
      </button>
      <span
        className={[
          'absolute top-2 right-2 text-[10px] px-2 py-1 rounded-full font-bold shadow',
          copied ? 'bg-green-500 text-white' : err ? 'bg-accent text-white' : 'bg-white/95 text-primary',
        ].join(' ')}
        onClick={handleCopy}
        role="button"
      >
        {copied ? '✅ 已复制' : err ? '❌ ' + err : '📋 复制图片'}
      </span>
    </div>
  );
}
