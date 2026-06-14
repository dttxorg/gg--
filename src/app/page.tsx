// 根路由：根据登录态重定向
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export default async function Home() {
  const session = await auth();
  if (!session) redirect('/login');
  redirect(session.user.role === 'ADMIN' ? '/admin' : '/library');
}
