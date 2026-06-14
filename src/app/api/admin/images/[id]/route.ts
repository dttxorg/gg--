// DELETE /api/admin/images/[id] — 删除图片
// 用 dynamic import 避免 build 阶段执行 import 链
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const { id } = await params;

  // 延迟到运行时才加载 Prisma 和 R2
  const { prisma } = await import('@/lib/prisma');
  const { deleteFromR2, keyFromUrl } = await import('@/lib/r2');

  const img = await prisma.postImage.findUnique({ where: { id } });
  if (!img) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const key = keyFromUrl(img.url);
  if (key) await deleteFromR2(key).catch(() => {});

  await prisma.postImage.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
