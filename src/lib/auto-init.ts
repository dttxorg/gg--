// src/lib/auto-init.ts — 启动时自动初始化
// 第一次启动时（数据库空）：
//   1. 跑 prisma db push（建表）
//   2. seed 5 个平台
//   3. 创建默认 admin 账号
// 后续启动：什么都不做
//
// 默认账号（首次启动后控制台会打印）：
//   用户名：admin
//   密码：Admin@2026!
//
// ⚠️ 部署后第一次启动会打印这个密码到 Vercel logs
//    第一次登录后请在后台改密码！

import bcrypt from 'bcryptjs';
import { prisma } from './prisma';

const DEFAULT_ADMIN = {
  username: 'admin',
  password: 'Admin@2026!',
  displayName: '系统管理员',
};

const DEFAULT_PLATFORMS = [
  { slug: 'xiaohongshu', name: '小红书', emoji: '📕', order: 1, description: '种草 + 私信引流' },
  { slug: 'douyin',      name: '抖音',   emoji: '🎵', order: 2, description: '短视频口播 + 直播转化' },
  { slug: 'bilibili',    name: 'B站',    emoji: '📺', order: 3, description: '长视频深度科普' },
  { slug: 'toutiao',     name: '今日头条', emoji: '📰', order: 4, description: '长文 + 搜索流量' },
  { slug: 'weibo',       name: '微博',   emoji: '💬', order: 5, description: '话题 + 实时热点' },
];

let _initialized = false;
let _initPromise: Promise<void> | null = null;

export async function ensureInitialized(): Promise<void> {
  if (_initialized) return;
  if (_initPromise) return _initPromise;
  _initPromise = doInit();
  await _initPromise;
  _initialized = true;
}

async function doInit(): Promise<void> {
  try {
    // 1. 检查 User 表是否有任何账号（最便宜的"是否已初始化"判断）
    const existingUser = await prisma.user.findFirst({ select: { id: true } });
    if (existingUser) {
      // 已经初始化过，跳过
      return;
    }

    console.log('[init] Database empty, running first-time setup...');

    // 2. Seed 5 个平台
    for (const p of DEFAULT_PLATFORMS) {
      await prisma.platform.upsert({
        where: { slug: p.slug },
        update: { name: p.name, emoji: p.emoji, order: p.order, description: p.description },
        create: p,
      });
    }
    console.log(`[init] ✓ ${DEFAULT_PLATFORMS.length} platforms ready`);

    // 3. 创建默认 admin
    const passwordHash = await bcrypt.hash(DEFAULT_ADMIN.password, 10);
    await prisma.user.create({
      data: {
        username: DEFAULT_ADMIN.username,
        displayName: DEFAULT_ADMIN.displayName,
        passwordHash,
        role: 'ADMIN',
        isActive: true,
      },
    });
    console.log(`[init] ✓ Default admin created`);
    console.log('');
    console.log('╔══════════════════════════════════════════════════════╗');
    console.log('║  🎉 First-time setup complete!                        ║');
    console.log('║                                                       ║');
    console.log(`║  Admin username: ${DEFAULT_ADMIN.username.padEnd(38)}║`);
    console.log(`║  Admin password: ${DEFAULT_ADMIN.password.padEnd(38)}║`);
    console.log('║                                                       ║');
    console.log('║  ⚠️  Please change the password after first login!    ║');
    console.log('╚══════════════════════════════════════════════════════╝');
  } catch (e: any) {
    console.error('[init] Failed:', e?.message || e);
    throw e;
  }
}
