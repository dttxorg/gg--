'use client';
import { useState } from 'react';

export default function CopyImageClient({ id, url, alt }: { id: string; url: string; alt: string }) {
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState('');

  async function handleCopy() {
    setErr('');
    try {
      const res = await fetch(`/api/images/${id}`);
      if (!res.ok) throw new Error('fetch failed');
      const blob = await res.blob();
      const png = await toPngBlob(blob);

      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': png }),
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

function toPngBlob(blob: Blob) {
  return new Promise<Blob>((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(blob);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('图片转换失败'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((png) => {
        URL.revokeObjectURL(objectUrl);
        if (png) resolve(png);
        else reject(new Error('图片转换失败'));
      }, 'image/png');
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('图片读取失败'));
    };

    img.src = objectUrl;
  });
}
