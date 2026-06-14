// /api/seed — 临时初始化路由：创建数据库表、平台数据和第一个管理员账号。
// 初始化完成并确认可登录后，应删除此文件再重新部署。
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@2026!';

const PLATFORMS = [
  { slug: 'xiaohongshu', name: '小红书', emoji: '📕', order: 1, description: '种草 + 私信引流' },
  { slug: 'douyin', name: '抖音', emoji: '🎵', order: 2, description: '短视频口播 + 直播转化' },
  { slug: 'bilibili', name: 'B站', emoji: '📺', order: 3, description: '长视频深度科普' },
  { slug: 'toutiao', name: '今日头条', emoji: '📰', order: 4, description: '长文 + 搜索流量' },
  { slug: 'weibo', name: '微博', emoji: '💬', order: 5, description: '话题 + 实时热点' },
];

const SCHEMA_STATEMENTS = [
  `DO $$
   BEGIN
     CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'AGENT');
   EXCEPTION
     WHEN duplicate_object THEN NULL;
   END $$`,
  `CREATE TABLE IF NOT EXISTS "User" (
     "id" TEXT PRIMARY KEY,
     "username" TEXT NOT NULL UNIQUE,
     "displayName" TEXT NOT NULL,
     "passwordHash" TEXT NOT NULL,
     "role" "UserRole" NOT NULL DEFAULT 'AGENT',
     "isActive" BOOLEAN NOT NULL DEFAULT true,
     "expireAt" TIMESTAMP(3),
     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
     "lastLoginAt" TIMESTAMP(3),
     "createdBy" TEXT
   )`,
  `CREATE TABLE IF NOT EXISTS "Platform" (
     "id" TEXT PRIMARY KEY,
     "slug" TEXT NOT NULL UNIQUE,
     "name" TEXT NOT NULL,
     "emoji" TEXT NOT NULL,
     "order" INTEGER NOT NULL DEFAULT 0,
     "description" TEXT
   )`,
  `CREATE TABLE IF NOT EXISTS "Post" (
     "id" TEXT PRIMARY KEY,
     "platformId" TEXT NOT NULL REFERENCES "Platform"("id") ON DELETE CASCADE ON UPDATE CASCADE,
     "title" TEXT NOT NULL,
     "subtitle" TEXT,
     "tags" TEXT,
     "contentHtml" TEXT NOT NULL,
     "contentText" TEXT NOT NULL,
     "order" INTEGER NOT NULL DEFAULT 0,
     "pinned" BOOLEAN NOT NULL DEFAULT false,
     "isDeleted" BOOLEAN NOT NULL DEFAULT false,
     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
     "authorId" TEXT REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
   )`,
  `CREATE TABLE IF NOT EXISTS "PostImage" (
     "id" TEXT PRIMARY KEY,
     "postId" TEXT NOT NULL REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE,
     "url" TEXT NOT NULL,
     "filename" TEXT NOT NULL,
     "mimeType" TEXT NOT NULL,
     "size" INTEGER NOT NULL,
     "order" INTEGER NOT NULL DEFAULT 0,
     "alt" TEXT,
     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
   )`,
  `CREATE INDEX IF NOT EXISTS "User_username_idx" ON "User"("username")`,
  `CREATE INDEX IF NOT EXISTS "Platform_order_idx" ON "Platform"("order")`,
  `CREATE INDEX IF NOT EXISTS "Post_platformId_isDeleted_order_idx" ON "Post"("platformId", "isDeleted", "order")`,
  `CREATE INDEX IF NOT EXISTS "Post_updatedAt_idx" ON "Post"("updatedAt")`,
  `CREATE INDEX IF NOT EXISTS "PostImage_postId_order_idx" ON "PostImage"("postId", "order")`,
];

export async function GET() {
  const log: string[] = [];
  const prisma = new PrismaClient();

  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { ok: false, error: 'Missing DATABASE_URL. Prisma reads DATABASE_URL, not POSTGRES_URL.', log },
        { status: 500 },
      );
    }

    log.push('1. Creating database schema...');
    for (const statement of SCHEMA_STATEMENTS) {
      await prisma.$executeRawUnsafe(statement);
    }
    log.push('   ✓ Tables ready');

    log.push('2. Connecting to database...');
    await prisma.$connect();
    log.push('   ✓ Connected');

    log.push('3. Seeding platforms...');
    for (const p of PLATFORMS) {
      await prisma.platform.upsert({
        where: { slug: p.slug },
        update: { name: p.name, emoji: p.emoji, order: p.order, description: p.description },
        create: p,
      });
    }
    log.push(`   ✓ ${PLATFORMS.length} platforms ready`);

    log.push('4. Creating admin account...');
    const existing = await prisma.user.findUnique({ where: { username: ADMIN_USERNAME } });
    if (!existing) {
      const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
      await prisma.user.create({
        data: {
          username: ADMIN_USERNAME,
          displayName: '系统管理员',
          passwordHash,
          role: 'ADMIN',
          isActive: true,
        },
      });
      log.push(`   ✓ Admin created: ${ADMIN_USERNAME}`);
    } else {
      log.push(`   ℹ Admin already exists: ${ADMIN_USERNAME}`);
    }

    return NextResponse.json({
      ok: true,
      log,
      credentials: { username: ADMIN_USERNAME, password: ADMIN_PASSWORD },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e), log }, { status: 500 });
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}
