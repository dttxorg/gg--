// DELETE /api/admin/images/[id] — 删除图片
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { deleteFromR2, keyFromUrl } from '@/lib/r2';

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const img = await prisma.postImage.findUnique({ where: { id: params.id } });
  if (!img) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const key = keyFromUrl(img.url);
  if (key) await deleteFromR2(key).catch(() => {});

  await prisma.postImage.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
