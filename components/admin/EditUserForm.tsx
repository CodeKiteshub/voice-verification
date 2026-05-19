'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@/lib/types';

export function EditUserForm({ user }: { user: User }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: user.name,
    email: user.email,
    role: user.role,
    call_limit: user.call_limit === -1 ? '' : String(user.call_limit),
    is_active: user.is_active,
    password: '',
  });
  const [error, setError]   = useState('');
  const [saved, setSaved]   = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaved(false);
    setLoading(true);
    try {
      const payload: Record<string, any> = {
        name: form.name,
        email: form.email,
        role: form.role,
        is_active: form.is_active,
        call_limit: form.role === 'admin' ? -1 : (form.call_limit ? parseInt(form.call_limit) : user.call_limit),
      };
      if (form.password) payload.password = form.password;

      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Failed to update user');
        return;
      }
      setSaved(true);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const unlimited = user.call_limit === -1;

  return (
    <form onSubmit={submit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5 max-w-lg">
      {/* Usage banner */}
      <div className="bg-gray-50 rounded-lg px-4 py-3">
        <p className="text-xs text-gray-500 mb-1">Call usage</p>
        {unlimited ? (
          <p className="text-sm font-medium text-indigo-600">Unlimited</p>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full"
                style={{ width: `${Math.min(100, Math.round((user.calls_used / user.call_limit) * 100))}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-gray-700">{user.calls_used} / {user.call_limit}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input
            required value={form.name} onChange={e => set('name', e.target.value)}
            className="w-full rounded-lg border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email" required value={form.email} onChange={e => set('email', e.target.value)}
            className="w-full rounded-lg border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
          <select
            value={form.role} onChange={e => set('role', e.target.value)}
            className="w-full rounded-lg border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        {form.role === 'user' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Call Limit</label>
            <input
              type="number" min="1" value={form.call_limit}
              onChange={e => set('call_limit', e.target.value)}
              className="w-full rounded-lg border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          New Password <span className="text-gray-400 font-normal">(leave blank to keep current)</span>
        </label>
        <input
          type="password" value={form.password} onChange={e => set('password', e.target.value)}
          minLength={8} placeholder="••••••••"
          className="w-full rounded-lg border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox" id="is_active" checked={form.is_active}
          onChange={e => set('is_active', e.target.checked)}
          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
        <label htmlFor="is_active" className="text-sm font-medium text-gray-700">Account active</label>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      {saved && <p className="text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2">Changes saved.</p>}

      <div className="flex gap-3 pt-2">
        <button
          type="submit" disabled={loading}
          className="px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors"
        >
          {loading ? 'Saving…' : 'Save changes'}
        </button>
        <button
          type="button" onClick={() => router.push('/admin/users')}
          className="px-5 py-2 border border-gray-300 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
        >
          Back to users
        </button>
      </div>
    </form>
  );
}
