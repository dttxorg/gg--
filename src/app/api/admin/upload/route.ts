// POST /api/admin/upload — 上传图片到 R2
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadToR2 } from '@/lib/r2';
import { getOrCreateDraftPost, isValidDraftKey } from '@/lib/post-images';

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const fd = await req.formData();
  const file = fd.get('file') as File | null;
  const postId = (fd.get('postId') as string) || null;
  const draftKey = (fd.get('draftKey') as string) || null;

  if (!file) return NextResponse.json({ error: 'no file' }, { status: 400 });
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: `不支持的格式: ${file.type}` }, { status: 400 });
  }
  if (file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: '文件超过 8MB' }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());

  try {
    let targetPostId: string;
    if (postId) {
      const post = await prisma.post.findFirst({
        where: { id: postId, isDeleted: false },
        select: { id: true },
      });
      if (!post) {
        return NextResponse.json({ error: '文案不存在' }, { status: 400 });
      }
      targetPostId = post.id;
    } else {
      if (!isValidDraftKey(draftKey)) {
        return NextResponse.json({ error: '缺少临时草稿标识' }, { status: 400 });
      }
      const draft = await getOrCreateDraftPost(prisma, session.user.id, draftKey!);
      targetPostId = draft.id;
    }

    const existingCount = await prisma.postImage.count({ where: { postId: targetPostId } });
    const r = await uploadToR2(buf, file.type, file.name);

    const img = await prisma.postImage.create({
      data: {
        postId: targetPostId,
        url: r.url,
        filename: file.name,
        mimeType: r.mimeType,
        size: r.size,
        order: existingCount,
      },
    });

    return NextResponse.json({
      id: img.id,
      url: img.url,
      filename: img.filename,
    });
  } catch (e: any) {
    console.error('upload failed', e);
    return NextResponse.json({ error: '上传失败，请重试' }, { status: 500 });
  }
}
