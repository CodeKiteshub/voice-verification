/**
 * GET  /api/admin/settings  — returns all settings
 * PATCH /api/admin/settings  — updates one or more settings
 *
 * Admin-only. Returns all 11 settings keys including VAPI + Pipecat config.
 * The existing GET /api/settings route still works for the legacy 3-key subset.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth';
import { getAllSettings, setSetting } from '@/lib/db';
import type { Settings } from '@/lib/types';

const ALLOWED_KEYS: (keyof Settings)[] = [
  'active_provider',
  'stt_enabled',
  'tts_voice',
  'agent_engine',
  'vapi_api_key',
  'vapi_phone_number_id',
  'vapi_llm_model',
  'vapi_tts_voice',
  'vapi_webhook_secret',
  'pipecat_server_url',
  'pipecat_tts_provider',
];

export async function GET(req: NextRequest) {
  const { error } = await requireAdminApi(req);
  if (error) return error;

  const settings = await getAllSettings();
  return NextResponse.json(settings);
}

export async function PATCH(req: NextRequest) {
  const { error } = await requireAdminApi(req);
  if (error) return error;

  const body = await req.json();
  const updates: Partial<Record<string, string>> = {};

  for (const key of ALLOWED_KEYS) {
    if (key in body) {
      updates[key] = String(body[key]);
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid settings keys provided' }, { status: 400 });
  }

  await Promise.all(
    Object.entries(updates).map(([k, v]) => setSetting(k, v!))
  );

  const updated = await getAllSettings();
  return NextResponse.json(updated);
}
