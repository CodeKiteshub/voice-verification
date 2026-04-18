import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getUsers, createUser } from '@/lib/db';
import { requireAdminApi } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const { error } = await requireAdminApi(req);
  if (error) return error;

  const search = new URL(req.url).searchParams.get('search') ?? undefined;
  return NextResponse.json(await getUsers({ search }));
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireAdminApi(req);
  if (error) return error;

  const body = await req.json();
  const {
    email, password, name, role = 'user', call_limit = 100, is_active = true,
    verification_provider, agent_engine,
  } = body;

  if (!email || !password || !name) {
    return NextResponse.json({ error: 'email, password, and name are required' }, { status: 400 });
  }
  if (!['admin', 'user'].includes(role)) {
    return NextResponse.json({ error: 'role must be admin or user' }, { status: 400 });
  }
  if (verification_provider && !['exotel', 'vobiz'].includes(verification_provider)) {
    return NextResponse.json({ error: 'verification_provider must be exotel or vobiz' }, { status: 400 });
  }
  if (agent_engine && !['vapi', 'pipecat'].includes(agent_engine)) {
    return NextResponse.json({ error: 'agent_engine must be vapi or pipecat' }, { status: 400 });
  }

  const password_hash = await bcrypt.hash(password, 12);
  try {
    const user = await createUser({
      email,
      password_hash,
      name,
      role,
      is_active,
      call_limit: Number(call_limit),
      created_by: session!.userId,
      ...(verification_provider ? { verification_provider } : {}),
      ...(agent_engine ? { agent_engine } : {}),
    });
    return NextResponse.json(user, { status: 201 });
  } catch (err: any) {
    if (err?.message?.includes('duplicate') || err?.code === 11000) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
    }
    throw err;
  }
}
