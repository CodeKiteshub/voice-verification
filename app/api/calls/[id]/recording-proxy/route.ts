import { NextRequest, NextResponse } from 'next/server';
import { requireApiSession, assertCallOwner } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireApiSession(req);
  if (error) return error;

  const { id } = await params;
  const { call, error: ownerErr } = await assertCallOwner(id, session!);
  if (ownerErr) return ownerErr;

  if (!call!.recording_url) return new NextResponse('Not found', { status: 404 });

  const headers: Record<string, string> = {};
  if (call!.provider === 'vobiz') {
    headers['X-Auth-ID'] = process.env.VOBIZ_API_KEY!;
    headers['X-Auth-Token'] = process.env.VOBIZ_AUTH_TOKEN!;
  } else {
    const creds = Buffer.from(
      `${process.env.EXOTEL_API_KEY}:${process.env.EXOTEL_API_TOKEN}`
    ).toString('base64');
    headers['Authorization'] = `Basic ${creds}`;
  }

  const res = await fetch(call!.recording_url, { headers });
  if (!res.ok) return new NextResponse('Proxy failed', { status: 502 });

  const audio = await res.arrayBuffer();
  return new NextResponse(audio, {
    headers: {
      'Content-Type': res.headers.get('Content-Type') ?? 'audio/mpeg',
      'Cache-Control': 'private, max-age=3600',
    },
  });
}
