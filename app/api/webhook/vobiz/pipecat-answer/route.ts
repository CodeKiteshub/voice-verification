import { NextRequest, NextResponse } from 'next/server';
import { verifyVobizWebhook } from '@/lib/auth';

function toWsUrl(url: string): string {
  return url.replace(/^https:\/\//i, 'wss://').replace(/^http:\/\//i, 'ws://');
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  if (!verifyVobizWebhook(req, rawBody)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const sp = new URL(req.url).searchParams;
  const callRecordId = sp.get('call_record_id') ?? '';
  const pipecatUrl = sp.get('pipecat_url') ?? '';
  const token = sp.get('token') ?? '';

  const wsBase = toWsUrl(pipecatUrl.replace(/\/+$/, ''));
  const wsUrl = `${wsBase}/ws/${callRecordId}?token=${token}`;

  console.log('[Pipecat Answer] callRecordId:', callRecordId, 'wsUrl:', wsUrl);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Stream bidirectional="true" keepCallAlive="true" contentType="audio/x-l16;rate=8000">${wsUrl}</Stream>
</Response>`;

  console.log('[Pipecat Answer] Returning XML:', xml);

  return new NextResponse(xml, { headers: { 'Content-Type': 'text/xml' } });
}
