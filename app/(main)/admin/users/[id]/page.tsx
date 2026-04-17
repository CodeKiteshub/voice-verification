import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { getUserById } from '@/lib/db';
import { EditUserForm } from '@/components/admin/EditUserForm';

export const dynamic = 'force-dynamic';

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const user = await getUserById(id);
  if (!user) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Edit User</h2>
        <p className="text-sm text-gray-500 mt-0.5">{user.email}</p>
      </div>
      <EditUserForm user={user} />
    </div>
  );
}
