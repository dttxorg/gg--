// src/lib/prisma.ts — Prisma client 单例
// build 阶段不初始化（避免 build 时尝试连接数据库）
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// 延迟初始化：只有真的用到 prisma 才会 new PrismaClient
// 这意味着 build 阶段不会触发 Prisma 内部模块加载
let _prisma: PrismaClient | null = null;

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

// 用 Proxy 包装：访问 prisma.xxx 时才真正初始化
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const real = getPrisma();
    const value = (real as any)[prop];
    return typeof value === 'function' ? value.bind(real) : value;
  },
});
