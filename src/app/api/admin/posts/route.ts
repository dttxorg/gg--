// POST /api/admin/posts — 新建
// PUT  /api/admin/posts/[id] — 更新
// DELETE /api/admin/posts/[id] — 软删除
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { attachImagesToPost, isValidDraftKey } from '@/lib/post-images';
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

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await req.json();
  const parsed = PostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid', detail: parsed.error.flatten() }, { status: 400 });
  }
  const d = parsed.data;
  const contentHtml = sanitizeContentHtml(d.contentHtml) || '<p></p>';

  if (d.imageIds.length > 0 && !isValidDraftKey(d.draftKey)) {
    return NextResponse.json({ error: 'invalid draft key' }, { status: 400 });
  }

  try {
    const post = await prisma.$transaction(async (tx) => {
      const created = await tx.post.create({
        data: {
          platformId: d.platformId,
          title: d.title,
          subtitle: d.subtitle || null,
          tags: d.tags || null,
          contentHtml,
          contentText: d.contentText,
          pinned: d.pinned,
          order: d.order,
          authorId: session.user.id,
        },
      });

      await attachImagesToPost(tx, {
        imageIds: d.imageIds,
        postId: created.id,
        userId: session.user.id,
        draftKey: d.draftKey,
      });

      return created;
    });

    return NextResponse.json({ id: post.id });
  } catch (e) {
    console.error('create post failed', e);
    return NextResponse.json({ error: '保存失败，请检查图片是否属于当前草稿' }, { status: 400 });
  }
}
