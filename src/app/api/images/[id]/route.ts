import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { id } = await params;
  const image = await prisma.postImage.findUnique({
    where: { id },
    select: { url: true, mimeType: true },
  });
  if (!image) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const publicHost = (process.env.R2_PUBLIC_HOST || '').replace(/\/$/, '');
  if (publicHost && !image.url.startsWith(`${publicHost}/`)) {
    return NextResponse.json({ error: 'invalid_image_host' }, { status: 400 });
  }

  const upstream = await fetch(image.url, { cache: 'force-cache' });
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: 'image_fetch_failed' }, { status: 502 });
  }

  return new NextResponse(upstream.body, {
    headers: {
      'Content-Type': upstream.headers.get('content-type') || image.mimeType || 'application/octet-stream',
      'Cache-Control': 'private, max-age=300',
    },
  });
}
