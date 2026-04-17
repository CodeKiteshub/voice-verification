import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { countUsers, createUser } from '@/lib/db';

// One-time bootstrap: creates the first admin user.
// Only works when SEED_ENABLED=true AND no users exist yet.
export async function POST(req: NextRequest) {
  if (process.env.SEED_ENABLED !== 'true') {
    return NextResponse.json({ error: 'Seed is disabled' }, { status: 404 });
  }

  const count = await countUsers();
  if (count > 0) {
    return NextResponse.json({ error: 'Users already exist. Seed can only run once.' }, { status: 409 });
  }

  const { email, password, name } = await req.json();
  if (!email || !password || !name) {
    return NextResponse.json({ error: 'email, password, and name are required' }, { status: 400 });
  }

  const password_hash = await bcrypt.hash(password, 12);
  const admin = await createUser({
    email,
    password_hash,
    name,
    role: 'admin',
    is_active: true,
    call_limit: -1,
  });

  return NextResponse.json({ success: true, userId: admin.id, role: admin.role }, { status: 201 });
}
