/**
 * GET /api/admin/vapi-import?id=<assistant_id>
 *
 * Fetches a VAPI assistant by ID using the stored API key and returns
 * the voice, model (provider + model name), and transcriber config.
 * Used by the Settings page "Import from VAPI" button to auto-fill fields.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth';
import { getAllSettings } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { error } = await requireAdminApi(req);
  if (error) return error;

  const id = req.nextUrl.searchParams.get('id')?.trim();
  if (!id) {
    return NextResponse.json({ error: 'Missing assistant id query param' }, { status: 400 });
  }

  const settings = await getAllSettings();
  const apiKey = settings.vapi_api_key;
  if (!apiKey) {
    return NextResponse.json({ error: 'VAPI API key not configured in Settings.' }, { status: 400 });
  }

  const res = await fetch(`https://api.vapi.ai/assistant/${id}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json(
      { error: `VAPI returned ${res.status}: ${text}` },
      { status: res.status }
    );
  }

  const assistant = await res.json();

  return NextResponse.json({
    voice: {
      provider: assistant.voice?.provider ?? '',
      voiceId:  assistant.voice?.voiceId  ?? assistant.voice?.voice ?? '',
    },
    model: {
      provider: assistant.model?.provider ?? '',
      model:    assistant.model?.model    ?? '',
    },
    transcriber: {
      provider: assistant.transcriber?.provider ?? '',
      model:    assistant.transcriber?.model    ?? '',
      language: assistant.transcriber?.language ?? '',
    },
  });
}
