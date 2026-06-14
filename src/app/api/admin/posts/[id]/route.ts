import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { attachImagesToPost } from '@/lib/post-images';
import { sanitizeContentHtml } from '@/lib/sanitize';
import { z } from 'zod';

const PostSchema = z.object({
  platformId: z.string().min(1),
  title: z.string().min(1).max(200),
  subtitle: z.string().max(500).optional().default(''),
  tags: z.string().max(200).optional().default(''),
  contentHtml: z.string().min(1),
  contentText: z.string().optional().default(''),
  pinned: z.boolean().optional().default(false),
  order: z.number().int().optional().default(0),
  imageIds: z.array(z.string()).max(80).optional().default([]),
  draftKey: z.string().optional().nullable(),
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
  const contentHtml = sanitizeContentHtml(d.contentHtml) || '<p></p>';

  try {
    const post = await prisma.$transaction(async (tx) => {
      const updated = await tx.post.update({
        where: { id },
        data: {
          platformId: d.platformId,
          title: d.title,
          subtitle: d.subtitle || null,
          tags: d.tags || null,
          contentHtml,
          contentText: d.contentText,
          pinned: d.pinned,
          order: d.order,
        },
      });

      await attachImagesToPost(tx, {
        imageIds: d.imageIds,
        postId: updated.id,
        userId: session.user.id,
        draftKey: d.draftKey,
      });

      return updated;
    });

    return NextResponse.json({ id: post.id });
  } catch (e) {
    console.error('update post failed', e);
    return NextResponse.json({ error: '保存失败，请检查图片是否属于当前文案' }, { status: 400 });
  }
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
