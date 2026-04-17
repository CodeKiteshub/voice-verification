import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextRequest, NextResponse } from 'next/server';
import { sessionOptions, type SessionData } from './session';
import { getCampaignById, getCallById } from './db';

// ─── Server Component helpers (use next/headers cookies) ─────────────────────

export async function getSession(): Promise<SessionData | null> {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.userId) return null;
  return session;
}

export async function requireSession(): Promise<SessionData> {
  const session = await getSession();
  if (!session) redirect('/login');
  return session;
}

export async function requireAdmin(): Promise<SessionData> {
  const session = await requireSession();
  if (session.role !== 'admin') redirect('/dashboard');
  return session;
}

// ─── API Route helpers (use request/response objects) ────────────────────────

export async function getApiSession(req: NextRequest): Promise<SessionData | null> {
  const res = new NextResponse();
  const session = await getIronSession<SessionData>(req, res, sessionOptions);
  if (!session.userId) return null;
  return session;
}

export async function requireApiSession(
  req: NextRequest
): Promise<{ session: SessionData; error: null } | { session: null; error: NextResponse }> {
  const session = await getApiSession(req);
  if (!session) {
    return { session: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  return { session, error: null };
}

export async function requireAdminApi(
  req: NextRequest
): Promise<{ session: SessionData; error: null } | { session: null; error: NextResponse }> {
  const { session, error } = await requireApiSession(req);
  if (error) return { session: null, error };
  if (session!.role !== 'admin') {
    return { session: null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { session: session!, error: null };
}

// ─── Ownership checks ────────────────────────────────────────────────────────

export async function assertCampaignOwner(
  campaignId: string,
  session: SessionData
): Promise<{ campaign: Awaited<ReturnType<typeof getCampaignById>>; error: NextResponse | null }> {
  const campaign = await getCampaignById(campaignId);
  if (!campaign) {
    return { campaign: null, error: NextResponse.json({ error: 'Not found' }, { status: 404 }) };
  }
  if (session.role !== 'admin' && campaign.user_id !== session.userId) {
    return { campaign: null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { campaign, error: null };
}

export async function assertCallOwner(
  callId: string,
  session: SessionData
): Promise<{ call: Awaited<ReturnType<typeof getCallById>>; error: NextResponse | null }> {
  const call = await getCallById(callId);
  if (!call) {
    return { call: null, error: NextResponse.json({ error: 'Not found' }, { status: 404 }) };
  }
  if (session.role !== 'admin' && call.user_id !== session.userId) {
    return { call: null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { call, error: null };
}
