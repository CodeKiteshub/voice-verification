import { NextRequest, NextResponse } from 'next/server';
import { getCallById } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const call = await getCallById(id);
  if (!call?.recording_url) return new NextResponse('Not found', { status: 404 });

  const creds = Buffer.from(
    `${process.env.EXOTEL_API_KEY}:${process.env.EXOTEL_API_TOKEN}`
  ).toString('base64');

  const res = await fetch(call.recording_url, { headers: { Authorization: `Basic ${creds}` } });
  if (!res.ok) return new NextResponse('Proxy failed', { status: 502 });

  const audio = await res.arrayBuffer();
  return new NextResponse(audio, {
    headers: {
      'Content-Type': res.headers.get('Content-Type') ?? 'audio/mpeg',
      'Cache-Control': 'private, max-age=3600',
    },
  });
}
