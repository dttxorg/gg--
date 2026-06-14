// POST /api/admin/upload — 上传图片到 R2
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadToR2, keyFromUrl } from '@/lib/r2';

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const fd = await req.formData();
  const file = fd.get('file') as File | null;
  const postId = (fd.get('postId') as string) || null;

  if (!file) return NextResponse.json({ error: 'no file' }, { status: 400 });
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: `不支持的格式: ${file.type}` }, { status: 400 });
  }
  if (file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: '文件超过 8MB' }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());

  try {
    const r = await uploadToR2(buf, file.type, file.name);

    // 关联到 PostImage 表
    const existingCount = postId
      ? await prisma.postImage.count({ where: { postId } })
      : 0;

    const img = await prisma.postImage.create({
      data: {
        postId: postId || (await getOrCreateOrphanPost()).id,
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
    return NextResponse.json({ error: e?.message || 'upload failed' }, { status: 500 });
  }
}

async function getOrCreateOrphanPost() {
  // 兜底：上传时若没有 postId，先存到一个 "临时" 平台 / 文案里
  // 实际使用中编辑器已创建/编辑 post，所以这分支几乎不会触发
  let platform = await prisma.platform.findFirst({ where: { slug: 'xiaohongshu' } });
  if (!platform) {
    platform = await prisma.platform.create({
      data: { slug: 'xiaohongshu', name: '小红书', emoji: '📕', order: 1 },
    });
  }
  const p = await prisma.post.create({
    data: {
      platformId: platform.id,
      title: '__orphan__',
      contentHtml: '<p></p>',
      contentText: '',
      isDeleted: true,
    },
  });
  return p;
}

// 没用但保留以避免 lint 警告
void keyFromUrl;
