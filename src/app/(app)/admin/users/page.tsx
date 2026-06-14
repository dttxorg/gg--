// 代理账号管理页
import { prisma } from '@/lib/prisma';
import UserManager from './UserManager';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, username: true, displayName: true, role: true, isActive: true, expireAt: true, createdAt: true, lastLoginAt: true },
  });

  return (
    <div>
      <div className="mb-5">
        <p className="text-xs font-black uppercase tracking-wider text-primary">Users</p>
        <h1 className="text-2xl font-black mt-1 mb-1">代理账号</h1>
        <p className="text-sm text-muted">管理所有可登录的代理账号（可设过期时间、临时改密、停用）</p>
      </div>
      <UserManager
        users={users.map((u) => ({
          ...u,
          createdAt: u.createdAt.toISOString(),
          lastLoginAt: u.lastLoginAt?.toISOString() || null,
          expireAt: u.expireAt?.toISOString() || null,
        }))}
      />
    </div>
  );
}
