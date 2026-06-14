import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sanitizeContentHtml } from '@/lib/sanitize';

const GuideSchema = z.object({
  title: z.string().min(1).max(120),
  summary: z.string().max(300).optional().default(''),
  contentHtml: z.string().min(1),
  contentText: z.string().optional().default(''),
  isPublished: z.boolean().optional().default(true),
});

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== 'ADMIN') return null;
  return session;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const guide = await prisma.globalIntro.findUnique({ where: { key: 'main' } });
  return NextResponse.json({ guide });
}

export async function PUT(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const parsed = GuideSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid', detail: parsed.error.flatten() }, { status: 400 });
  }

  const d = parsed.data;
  const contentHtml = sanitizeContentHtml(d.contentHtml) || '<p></p>';
  const guide = await prisma.globalIntro.upsert({
    where: { key: 'main' },
    update: {
      title: d.title,
      summary: d.summary || null,
      contentHtml,
      contentText: d.contentText,
      isPublished: d.isPublished,
    },
    create: {
      key: 'main',
      title: d.title,
      summary: d.summary || null,
      contentHtml,
      contentText: d.contentText,
      isPublished: d.isPublished,
    },
  });

  revalidatePath('/admin/posts');
  revalidatePath('/admin/guide');
  revalidatePath('/library');

  return NextResponse.json({ id: guide.id });
}
