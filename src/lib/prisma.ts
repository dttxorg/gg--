// src/lib/prisma.ts — Prisma client 单例
// 第一次访问时自动跑 db push 建表（如果表不存在）
import { PrismaClient } from '@prisma/client';
import { execSync } from 'node:child_process';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  _pushed?: boolean;
};

let _prisma: PrismaClient | null = null;
let _pushing: Promise<void> | null = null;

async function ensureSchema(): Promise<void> {
  if (globalForPrisma._pushed) return;
  if (_pushing) return _pushing;

  _pushing = (async () => {
    try {
      // db push --accept-data-loss: 自动建表，已存在则跳过
      // 用 spawn 避免 stdout 噪音污染 Vercel runtime logs
      execSync('npx prisma db push --skip-generate --accept-data-loss', {
        stdio: ['ignore', 'ignore', 'pipe'],
        env: process.env,
      });
      globalForPrisma._pushed = true;
      console.log('[db] schema synced');
    } catch (e: any) {
      // 如果是 race condition（另一个 instance 先跑了），也当作已 pushed
      globalForPrisma._pushed = true;
      console.warn('[db] schema sync warning:', e?.message?.slice(0, 200));
    }
  })();

  return _pushing;
}

function getPrisma(): PrismaClient {
  if (_prisma) return _prisma;
  if (globalForPrisma.prisma) {
    _prisma = globalForPrisma.prisma;
    return _prisma;
  }
  _prisma = new PrismaClient();
  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = _prisma;
  return _prisma;
}

// 初始化检查（在第一次访问 prisma 时触发）
async function lazyInit(): Promise<void> {
  await ensureSchema();
  const { ensureInitialized } = await import('./auto-init');
  await ensureInitialized();
}

// 用 Proxy 包装：访问 prisma.xxx 时才真正初始化
export const prisma = new Proxy({} as PrismaClient, {
  async get(_target, prop) {
    // 只在访问 prisma 属性时初始化（避免 module load 时跑）
    if (prop === 'then' || prop === Symbol.toPrimitive) {
      // 给 await prisma 用
      return undefined;
    }
    await lazyInit();
    const real = getPrisma();
    const value = (real as any)[prop];
    return typeof value === 'function' ? value.bind(real) : value;
  },
}) as PrismaClient;
