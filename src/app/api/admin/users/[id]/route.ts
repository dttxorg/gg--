// 单个用户操作：更新 / 改密 / 启用停用
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== 'ADMIN') return null;
  return session;
}

const PatchSchema = z.object({
  displayName: z.string().min(1).max(64).optional(),
  password: z.string().min(6).max(128).optional(),
  role: z.enum(['ADMIN', 'AGENT']).optional(),
  isActive: z.boolean().optional(),
  expireAt: z.string().nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const s = await requireAdmin();
  if (!s) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid' }, { status: 400 });
  const d = parsed.data;

  const data: any = {};
  if (d.displayName !== undefined) data.displayName = d.displayName;
  if (d.role) data.role = d.role;
  if (d.isActive !== undefined) data.isActive = d.isActive;
  if (d.expireAt !== undefined) data.expireAt = d.expireAt ? new Date(d.expireAt) : null;
  if (d.password) data.passwordHash = await bcrypt.hash(d.password, 10);

  const u = await prisma.user.update({ where: { id: params.id }, data });
  return NextResponse.json({ id: u.id });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const s = await requireAdmin();
  if (!s) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (params.id === s.user.id) {
    return NextResponse.json({ error: '不能删除自己' }, { status: 400 });
  }
  await prisma.user.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
