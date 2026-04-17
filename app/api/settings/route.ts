import { NextRequest, NextResponse } from 'next/server';
import { getSetting, setSetting, initSettings } from '@/lib/db';
import { requireAdminApi } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const { error } = await requireAdminApi(req);
  if (error) return error;

  await initSettings();
  const [active_provider, stt_enabled_str, tts_voice] = await Promise.all([
    getSetting('active_provider'),
    getSetting('stt_enabled'),
    getSetting('tts_voice'),
  ]);
  return NextResponse.json({
    active_provider: active_provider ?? 'exotel',
    stt_enabled: stt_enabled_str !== 'false',
    tts_voice: tts_voice ?? 'anushka',
  });
}

export async function PATCH(req: NextRequest) {
  const { error } = await requireAdminApi(req);
  if (error) return error;

  const body = await req.json();
  const ops: Promise<void>[] = [];
  if (body.active_provider !== undefined) ops.push(setSetting('active_provider', body.active_provider));
  if (body.stt_enabled !== undefined) ops.push(setSetting('stt_enabled', String(body.stt_enabled)));
  if (body.tts_voice !== undefined) ops.push(setSetting('tts_voice', body.tts_voice));
  await Promise.all(ops);
  return NextResponse.json({ success: true });
}
