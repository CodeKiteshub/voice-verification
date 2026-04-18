'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function CreateUserForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '', email: '', password: '',
    role: 'user', call_limit: '100', is_active: true,
    verification_provider: 'exotel',
    agent_engine: 'vapi',
  });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
          is_active: form.is_active,
          call_limit: form.role === 'admin' ? -1 : parseInt(form.call_limit),
          // Only include infra assignments for regular users — keep admin documents clean
          ...(form.role === 'user' ? {
            verification_provider: form.verification_provider,
            agent_engine: form.agent_engine,
          } : {}),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Failed to create user');
        return;
      }
      router.push('/admin/users');
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5 max-w-lg">
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

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
        <input
          type="password" required value={form.password} onChange={e => set('password', e.target.value)}
          minLength={8} placeholder="Min. 8 characters"
          className="w-full rounded-lg border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
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
              type="number" min="1" required value={form.call_limit}
              onChange={e => set('call_limit', e.target.value)}
              className="w-full rounded-lg border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
            <p className="text-xs text-gray-400 mt-1">Total calls this user can make</p>
          </div>
        )}
      </div>

      {/* Infrastructure assignments — only meaningful for regular users */}
      {form.role === 'user' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Verification Provider
            </label>
            <select
              value={form.verification_provider}
              onChange={e => set('verification_provider', e.target.value)}
              className="w-full rounded-lg border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="exotel">Exotel</option>
              <option value="vobiz">Vobiz</option>
            </select>
            <p className="text-xs text-gray-400 mt-1">Used for verification campaigns</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              AI Agent Engine
            </label>
            <select
              value={form.agent_engine}
              onChange={e => set('agent_engine', e.target.value)}
              className="w-full rounded-lg border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="vapi">VAPI (~₹70 / call)</option>
              <option value="pipecat">Pipecat (~₹10 / call)</option>
            </select>
            <p className="text-xs text-gray-400 mt-1">Used for AI agent campaigns</p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <input
          type="checkbox" id="is_active" checked={form.is_active}
          onChange={e => set('is_active', e.target.checked)}
          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
        <label htmlFor="is_active" className="text-sm font-medium text-gray-700">Account active</label>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button
          type="submit" disabled={loading}
          className="px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors"
        >
          {loading ? 'Creating…' : 'Create user'}
        </button>
        <button
          type="button" onClick={() => router.back()}
          className="px-5 py-2 border border-gray-300 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
