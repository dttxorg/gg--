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
  const passwordHash = await bcrypt.hash(adminPassword, 10);
  const existing = await prisma.user.findUnique({ where: { username: adminUsername } });
  await prisma.user.upsert({
    where: { username: adminUsername },
    update: {
      passwordHash,
      role: 'ADMIN',
      isActive: true,
      expireAt: null,
    },
    create: {
      username: adminUsername,
      displayName: '系统管理员',
      passwordHash,
      role: 'ADMIN',
      isActive: true,
    },
  });
  if (!existing) {
    console.log(`✅ 管理员账号已创建: ${adminUsername} / ${adminPassword}`);
    console.log('⚠️  请尽快登录后修改密码！');
  } else {
    console.log(`✅ 管理员账号已同步: ${adminUsername} / ${adminPassword}`);
  }

  await prisma.globalIntro.upsert({
    where: { key: 'main' },
    update: {},
    create: {
      key: 'main',
      title: '总体介绍',
      summary: '业务说明、常见问题和注意事项集中放在这里。',
      contentHtml: DEFAULT_INTRO_HTML,
      contentText: '业务说明\n这里可以放 giffgaff 代理业务的整体介绍、适合人群、办理流程和常用话术。\n\n注意事项\n账号、订单、物流和售后信息建议统一记录，避免重复沟通。\n涉及价格、活动、实名和时效的信息，发布前请先确认是否为最新版本。\n\n常见问题\n可以在这里集中整理代理经常会遇到的问题，方便新人先看总说明，再进入各平台文案。',
      isPublished: true,
    },
  });
  console.log('✅ 总体介绍已就位');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
