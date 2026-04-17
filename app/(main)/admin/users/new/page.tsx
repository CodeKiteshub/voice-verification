import { requireAdmin } from '@/lib/auth';
import { CreateUserForm } from '@/components/admin/CreateUserForm';

export const metadata = { title: 'New User — Admin' };

export default async function NewUserPage() {
  await requireAdmin();
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Create User</h2>
        <p className="text-sm text-gray-500 mt-0.5">Add a new user account and set their call limit</p>
      </div>
      <CreateUserForm />
    </div>
  );
}
