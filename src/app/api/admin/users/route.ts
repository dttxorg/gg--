// 用户管理：账号 CRUD
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { UserRole } from '@prisma/client';

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== 'ADMIN') return null;
  return session;
}

const CreateSchema = z.object({
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/, '只允许字母数字下划线'),
  displayName: z.string().min(1).max(64),
  password: z.string().min(6).max(128),
  role: z.enum(['ADMIN', 'AGENT']).default('AGENT'),
  expireAt: z.string().optional().nullable(),
});

export async function GET() {
  const s = await requireAdmin();
  if (!s) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, username: true, displayName: true, role: true, isActive: true, expireAt: true, createdAt: true, lastLoginAt: true },
  });
  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const s = await requireAdmin();
  if (!s) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid', detail: parsed.error.flatten() }, { status: 400 });
  const d = parsed.data;

  const exists = await prisma.user.findUnique({ where: { username: d.username } });
  if (exists) return NextResponse.json({ error: '用户名已存在' }, { status: 409 });

  const passwordHash = await bcrypt.hash(d.password, 10);
  const user = await prisma.user.create({
    data: {
      username: d.username,
      displayName: d.displayName,
      passwordHash,
      role: d.role as UserRole,
      expireAt: d.expireAt ? new Date(d.expireAt) : null,
      createdBy: s.user.id,
    },
  });
  return NextResponse.json({ id: user.id });
}
