import { requireSession } from '@/lib/auth';
import { getUserById } from '@/lib/db';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';

export const dynamic = 'force-dynamic';

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();

  // Fetch fresh user data so call usage is always current
  const user = await getUserById(session.userId);
  const freshSession = {
    ...session,
    callsUsed: user?.calls_used ?? session.callsUsed,
    callLimit: user?.call_limit ?? session.callLimit,
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar session={freshSession} />
      <div className="flex-1 flex flex-col">
        <TopBar session={freshSession} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
