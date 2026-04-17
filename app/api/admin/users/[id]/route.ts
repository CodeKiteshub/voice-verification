import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getUserById, updateUser } from '@/lib/db';
import { requireAdminApi } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdminApi(req);
  if (error) return error;

  const { id } = await params;
  const user = await getUserById(id);
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(user);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAdminApi(req);
  if (error) return error;

  const { id } = await params;
  const existing = await getUserById(id);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const { name, email, password, role, call_limit, is_active } = body;

  const update: Record<string, any> = {};
  if (name        !== undefined) update.name        = name;
  if (email       !== undefined) update.email       = email.toLowerCase().trim();
  if (role        !== undefined) update.role        = role;
  if (call_limit  !== undefined) update.call_limit  = Number(call_limit);
  if (is_active   !== undefined) update.is_active   = Boolean(is_active);
  if (password) {
    update.password_hash = await bcrypt.hash(password, 12);
  }

  // Prevent admin from accidentally removing their own admin role
  if (id === session!.userId && role && role !== 'admin') {
    return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 });
  }

  const updated = await updateUser(id, update);
  return NextResponse.json(updated);
}
