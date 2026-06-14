// /api/seed — 受 SEED_TOKEN 保护的初始化路由。
// 生产环境未配置 SEED_TOKEN 时，该路由默认不可用。
import { NextRequest, NextResponse } from 'next/server';
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

const DEFAULT_INTRO_HTML = `
<h2>业务说明</h2>
<p>这里可以放 giffgaff 代理业务的整体介绍、适合人群、办理流程和常用话术。</p>
<h2>注意事项</h2>
<ul>
  <li>账号、订单、物流和售后信息建议统一记录，避免重复沟通。</li>
  <li>涉及价格、活动、实名和时效的信息，发布前请先确认是否为最新版本。</li>
</ul>
<h2>常见问题</h2>
<p>可以在这里集中整理代理经常会遇到的问题，方便新人先看总说明，再进入各平台文案。</p>
`.trim();

const DEFAULT_INTRO_TEXT = [
  '业务说明',
  '这里可以放 giffgaff 代理业务的整体介绍、适合人群、办理流程和常用话术。',
  '',
  '注意事项',
  '账号、订单、物流和售后信息建议统一记录，避免重复沟通。',
  '涉及价格、活动、实名和时效的信息，发布前请先确认是否为最新版本。',
  '',
  '常见问题',
  '可以在这里集中整理代理经常会遇到的问题，方便新人先看总说明，再进入各平台文案。',
].join('\n');

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
  `CREATE TABLE IF NOT EXISTS "GlobalIntro" (
     "id" TEXT PRIMARY KEY,
     "key" TEXT NOT NULL UNIQUE DEFAULT 'main',
     "title" TEXT NOT NULL DEFAULT '总体介绍',
     "summary" TEXT,
     "contentHtml" TEXT NOT NULL,
     "contentText" TEXT NOT NULL,
     "isPublished" BOOLEAN NOT NULL DEFAULT true,
     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
   )`,
  `CREATE INDEX IF NOT EXISTS "User_username_idx" ON "User"("username")`,
  `CREATE INDEX IF NOT EXISTS "Platform_order_idx" ON "Platform"("order")`,
  `CREATE INDEX IF NOT EXISTS "Post_platformId_isDeleted_order_idx" ON "Post"("platformId", "isDeleted", "order")`,
  `CREATE INDEX IF NOT EXISTS "Post_updatedAt_idx" ON "Post"("updatedAt")`,
  `CREATE INDEX IF NOT EXISTS "PostImage_postId_order_idx" ON "PostImage"("postId", "order")`,
  `CREATE INDEX IF NOT EXISTS "GlobalIntro_isPublished_idx" ON "GlobalIntro"("isPublished")`,
];

function isSeedAuthorized(req: NextRequest) {
  const seedToken = process.env.SEED_TOKEN;
  if (!seedToken) return false;
  const requestToken = req.headers.get('x-seed-token') || req.nextUrl.searchParams.get('token');
  return requestToken === seedToken;
}

export async function GET(req: NextRequest) {
  const log: string[] = [];
  const prisma = new PrismaClient();

  try {
    if (!isSeedAuthorized(req)) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

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
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    await prisma.user.upsert({
      where: { username: ADMIN_USERNAME },
      update: {
        passwordHash,
        role: 'ADMIN',
        isActive: true,
        expireAt: null,
      },
      create: {
        username: ADMIN_USERNAME,
        displayName: '系统管理员',
        passwordHash,
        role: 'ADMIN',
        isActive: true,
      },
    });
    if (!existing) {
      log.push(`   ✓ Admin created: ${ADMIN_USERNAME}`);
    } else {
      log.push(`   ✓ Admin synced: ${ADMIN_USERNAME}`);
    }

    log.push('5. Preparing global intro...');
    await prisma.globalIntro.upsert({
      where: { key: 'main' },
      update: {},
      create: {
        key: 'main',
        title: '总体介绍',
        summary: '业务说明、常见问题和注意事项集中放在这里。',
        contentHtml: DEFAULT_INTRO_HTML,
        contentText: DEFAULT_INTRO_TEXT,
        isPublished: true,
      },
    });
    log.push('   ✓ Global intro ready');

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
