// db-seed.mjs — 初始化平台数据 + 第一个管理员账号
// 用法: node scripts/db-seed.mjs
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const PLATFORMS = [
  { slug: 'xiaohongshu', name: '小红书', emoji: '📕', order: 1, description: '种草 + 私信引流' },
  { slug: 'douyin',      name: '抖音',   emoji: '🎵', order: 2, description: '短视频口播 + 直播转化' },
  { slug: 'bilibili',    name: 'B站',    emoji: '📺', order: 3, description: '长视频深度科普' },
  { slug: 'toutiao',     name: '今日头条', emoji: '📰', order: 4, description: '长文 + 搜索流量' },
  { slug: 'weibo',       name: '微博',   emoji: '💬', order: 5, description: '话题 + 实时热点' },
];

async function main() {
  // 1) 平台
  for (const p of PLATFORMS) {
    await prisma.platform.upsert({
      where: { slug: p.slug },
      update: { name: p.name, emoji: p.emoji, order: p.order, description: p.description },
      create: p,
    });
  }
  console.log(`✅ ${PLATFORMS.length} 个平台已就位`);

  // 2) 管理员账号（从环境变量读，初次默认 admin / Admin@2026!）
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@2026!';
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
    console.log(`✅ 管理员账号已创建: ${adminUsername} / ${adminPassword}`);
    console.log('⚠️  请尽快登录后修改密码！');
  } else {
    console.log(`ℹ️  管理员已存在: ${adminUsername}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
