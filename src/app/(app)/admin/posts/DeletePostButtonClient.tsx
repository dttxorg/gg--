'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DeletePostButtonClient({ id }: { id: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    if (!confirm('确定删除这条文案吗？')) return;
    setPending(true);
    const res = await fetch(`/api/admin/posts/${id}`, { method: 'DELETE' });
    if (res.ok) {
      router.refresh();
    } else {
      alert('删除失败');
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={pending}
      className="px-2.5 py-1 text-xs font-bold text-accent bg-paper-2 border border-line rounded-full hover:bg-accent hover:text-white transition disabled:opacity-50"
    >
      {pending ? '…' : '删除'}
    </button>
  );
}
