'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  username: string;
  displayName: string;
  role: 'ADMIN' | 'AGENT';
  isActive: boolean;
  expireAt: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}

export default function UserManager({ users }: { users: User[] }) {
  const router = useRouter();
  const [showNew, setShowNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ username: '', displayName: '', password: '', role: 'AGENT' as 'AGENT' | 'ADMIN', expireAt: '' });
  const [editForm, setEditForm] = useState<{ displayName: string; password: string; isActive: boolean; expireAt: string }>({ displayName: '', password: '', isActive: true, expireAt: '' });
  const [err, setErr] = useState('');
  const [pending, setPending] = useState(false);

  async function handleCreate() {
    setErr('');
    if (form.password.length < 6) { setErr('密码至少 6 位'); return; }
    setPending(true);
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        expireAt: form.expireAt || null,
      }),
    });
    setPending(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error || '创建失败');
      return;
    }
    setShowNew(false);
    setForm({ username: '', displayName: '', password: '', role: 'AGENT', expireAt: '' });
    router.refresh();
  }

  async function handlePatch(id: string, data: any) {
    setPending(true);
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    setPending(false);
    if (!res.ok) { alert('操作失败'); return; }
    setEditingId(null);
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm('确定删除这个账号？')) return;
    const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
    if (!res.ok) { alert('删除失败'); return; }
    router.refresh();
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          type="button"
          onClick={() => setShowNew(!showNew)}
          className="px-5 py-2.5 bg-primary text-white font-bold rounded-full shadow-sm hover:bg-primary-dark transition"
        >
          {showNew ? '取消' : '+ 新建账号'}
        </button>
      </div>

      {showNew && (
        <div className="bg-white border border-line rounded-[18px] p-5 mb-5">
          <h2 className="text-base font-black mb-3">新建账号</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="用户名（字母数字下划线）">
              <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="w-full px-3 py-2 border border-line rounded-sm bg-paper-2 outline-none focus:border-primary" />
            </Field>
            <Field label="显示名（中文）">
              <input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} className="w-full px-3 py-2 border border-line rounded-sm bg-paper-2 outline-none focus:border-primary" />
            </Field>
            <Field label="初始密码（≥6 位）">
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full px-3 py-2 border border-line rounded-sm bg-paper-2 outline-none focus:border-primary" />
            </Field>
            <Field label="角色">
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as any })} className="w-full px-3 py-2 border border-line rounded-sm bg-paper-2 outline-none focus:border-primary">
                <option value="AGENT">代理（只读）</option>
                <option value="ADMIN">管理员</option>
              </select>
            </Field>
            <Field label="过期时间（可选）">
              <input type="date" value={form.expireAt} onChange={(e) => setForm({ ...form, expireAt: e.target.value })} className="w-full px-3 py-2 border border-line rounded-sm bg-paper-2 outline-none focus:border-primary" />
            </Field>
          </div>
          {err && <p className="text-sm text-accent mt-2">{err}</p>}
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={handleCreate} disabled={pending} className="px-5 py-2 bg-primary text-white font-bold rounded-full hover:bg-primary-dark transition disabled:opacity-60">
              {pending ? '创建中…' : '创建'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white border border-line rounded-[18px] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-paper-2 text-xs text-muted">
            <tr>
              <th className="text-left px-4 py-2.5 font-bold">用户</th>
              <th className="text-left px-4 py-2.5 font-bold hidden sm:table-cell">角色</th>
              <th className="text-left px-4 py-2.5 font-bold hidden md:table-cell">最后登录</th>
              <th className="text-left px-4 py-2.5 font-bold hidden md:table-cell">过期</th>
              <th className="text-right px-4 py-2.5 font-bold">操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-line hover:bg-soft-2 transition">
                <td className="px-4 py-3">
                  <p className="font-bold m-0">{u.displayName}</p>
                  <p className="text-xs text-muted m-0">@{u.username}</p>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <span className={['text-[10px] px-1.5 py-0.5 rounded font-bold', u.role === 'ADMIN' ? 'bg-accent text-white' : 'bg-primary/10 text-primary'].join(' ')}>
                    {u.role === 'ADMIN' ? '管理员' : '代理'}
                  </span>
                  {!u.isActive && <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded font-bold bg-muted/20 text-muted">停用</span>}
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-xs text-muted">
                  {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('zh-CN') : '从未'}
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-xs text-muted">
                  {u.expireAt ? new Date(u.expireAt).toLocaleDateString('zh-CN') : '永久'}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (editingId === u.id) {
                          setEditingId(null);
                        } else {
                          setEditingId(u.id);
                          setEditForm({
                            displayName: u.displayName,
                            password: '',
                            isActive: u.isActive,
                            expireAt: u.expireAt ? u.expireAt.slice(0, 10) : '',
                          });
                        }
                      }}
                      className="px-2.5 py-1 text-xs font-bold text-primary bg-paper-2 border border-line rounded-full hover:bg-primary hover:text-white transition"
                    >
                      {editingId === u.id ? '取消' : '编辑'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(u.id)}
                      className="px-2.5 py-1 text-xs font-bold text-accent bg-paper-2 border border-line rounded-full hover:bg-accent hover:text-white transition"
                    >
                      删除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={5} className="text-center text-muted py-10">还没有账号</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editingId && (() => {
        const u = users.find((x) => x.id === editingId)!;
        return (
          <div className="mt-4 bg-white border border-line rounded-[18px] p-5">
            <h3 className="text-sm font-black mb-3">编辑 @{u.username}</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="显示名">
                <input value={editForm.displayName} onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })} className="w-full px-3 py-2 border border-line rounded-sm bg-paper-2 outline-none focus:border-primary" />
              </Field>
              <Field label="新密码（留空不改）">
                <input type="password" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} className="w-full px-3 py-2 border border-line rounded-sm bg-paper-2 outline-none focus:border-primary" />
              </Field>
              <Field label="过期时间">
                <input type="date" value={editForm.expireAt} onChange={(e) => setEditForm({ ...editForm, expireAt: e.target.value })} className="w-full px-3 py-2 border border-line rounded-sm bg-paper-2 outline-none focus:border-primary" />
              </Field>
              <Field label="状态">
                <select value={editForm.isActive ? '1' : '0'} onChange={(e) => setEditForm({ ...editForm, isActive: e.target.value === '1' })} className="w-full px-3 py-2 border border-line rounded-sm bg-paper-2 outline-none focus:border-primary">
                  <option value="1">启用</option>
                  <option value="0">停用</option>
                </select>
              </Field>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => handlePatch(u.id, {
                  displayName: editForm.displayName,
                  password: editForm.password || undefined,
                  isActive: editForm.isActive,
                  expireAt: editForm.expireAt || null,
                })}
                disabled={pending}
                className="px-5 py-2 bg-primary text-white font-bold rounded-full hover:bg-primary-dark transition disabled:opacity-60"
              >
                {pending ? '保存中…' : '保存'}
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-muted mb-1.5">{label}</label>
      {children}
    </div>
  );
}
