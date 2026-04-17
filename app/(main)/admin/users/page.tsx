import Link from 'next/link';
import { getUsers } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { UserTable } from '@/components/admin/UserTable';
import { Plus } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  await requireAdmin();
  const users = await getUsers();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Users</h2>
          <p className="text-sm text-gray-500 mt-0.5">{users.length} user{users.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/admin/users/new"
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          New User
        </Link>
      </div>
      <UserTable users={users} />
    </div>
  );
}
