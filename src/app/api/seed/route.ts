// /api/seed — 临时路由：跑 db push + 创建 admin 账号
// 跑完后我会让用户删除这个文件
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { execSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';

export async function GET() {
  const log: string[] = [];
  try {
    log.push('1. Running prisma db push...');
    execSync('npx prisma db push --skip-generate --accept-data-loss', {
      stdio: 'pipe',
      env: process.env,
    });
    log.push('   ✓ Tables created');

    log.push('2. Connecting to database...');
    const prisma = new PrismaClient();
    await prisma.$connect();
    log.push('   ✓ Connected');

    log.push('3. Seeding platforms...');
    const PLATFORMS = [
      { slug: 'xiaohongshu', name: '小红书', emoji: '📕', order: 1, description: '种草 + 私信引流' },
      { slug: 'douyin',      name: '抖音',   emoji: '🎵', order: 2, description: '短视频口播 + 直播转化' },
      { slug: 'bilibili',    name: 'B站',    emoji: '📺', order: 3, description: '长视频深度科普' },
      { slug: 'toutiao',     name: '今日头条', emoji: '📰', order: 4, description: '长文 + 搜索流量' },
      { slug: 'weibo',       name: '微博',   emoji: '💬', order: 5, description: '话题 + 实时热点' },
    ];
    for (const p of PLATFORMS) {
      await prisma.platform.upsert({
        where: { slug: p.slug },
        update: { name: p.name, emoji: p.emoji, order: p.order, description: p.description },
        create: p,
      });
    }
    log.push(`   ✓ ${PLATFORMS.length} platforms ready`);

    log.push('4. Creating admin account...');
    const adminUsername = 'admin';
    const adminPassword = 'Admin@2026!';
    const existing = await prisma.user.findUnique({ where: { username: adminUsername } });
    if (!existing) {
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      await prisma.user.create({
        data: {
          username: adminUsername,
          displayName: '系统管理员',
          passwordHash,
          role: 'ADMIN',
          isActive: true,
        },
      });
      log.push(`   ✓ Admin created: ${adminUsername} / ${adminPassword}`);
    } else {
      log.push(`   ℹ Admin already exists: ${adminUsername}`);
    }

    await prisma.$disconnect();
    log.push('');
    log.push('🎉 All done! Now you can:');
    log.push(`   1. Visit ${process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'the login page'}/login`);
    log.push(`   2. Login with: ${adminUsername} / ${adminPassword}`);
    log.push(`   3. Delete /api/seed route after testing (security)`);

    return NextResponse.json({ ok: true, log, credentials: { username: adminUsername, password: adminPassword } });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e), log }, { status: 500 });
  }
}
