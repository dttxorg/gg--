import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const PostSchema = z.object({
  platformId: z.string().min(1),
  title: z.string().min(1).max(200),
  subtitle: z.string().max(500).optional().default(''),
  tags: z.string().max(200).optional().default(''),
  contentHtml: z.string().min(1),
  contentText: z.string().min(1),
  pinned: z.boolean().optional().default(false),
  order: z.number().int().optional().default(0),
});

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== 'ADMIN') return null;
  return session;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const { id } = await params;

  const body = await req.json();
  const parsed = PostSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid' }, { status: 400 });
  const d = parsed.data;

  const post = await prisma.post.update({
    where: { id },
    data: {
      platformId: d.platformId,
      title: d.title,
      subtitle: d.subtitle || null,
      tags: d.tags || null,
      contentHtml: d.contentHtml,
      contentText: d.contentText,
      pinned: d.pinned,
      order: d.order,
    },
  });
  return NextResponse.json({ id: post.id });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const { id } = await params;

  // 软删除：标记 isDeleted，不真删（保留回收站能力）
  await prisma.post.update({
    where: { id },
    data: { isDeleted: true },
  });
  return NextResponse.json({ ok: true });
}
