/**
 * POST /api/campaigns/[id]/contacts/upload
 *
 * Accepts a multipart/form-data file upload (CSV or Excel .xlsx/.xls).
 * Parses phone numbers and optional names, adds them as contacts.
 *
 * Column detection (case-insensitive):
 *   Phone: "phone", "mobile", "number", "contact", "tel", "cell", "ph"
 *   Name:  "name", "contact name", "full name", "first name", "customer"
 * If no headers match, first column = phone, second = name.
 *
 * Returns: { added: number, skipped: number, sample: string[] }
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireApiSession, assertCampaignOwner } from '@/lib/auth';
import { addContacts } from '@/lib/db';
import * as XLSX from 'xlsx';

// ─── helpers ──────────────────────────────────────────────────────────────────

function normalise(s: unknown): string {
  return String(s ?? '').trim();
}

/** Strip formatting chars, keep +, digits, spaces */
function cleanPhone(raw: string): string {
  return raw.replace(/[^\d+\s]/g, '').trim();
}

/** Return true if looks like a valid phone number (7–15 digits) */
function isValidPhone(s: string): boolean {
  const digits = s.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

const PHONE_HEADERS = ['phone', 'mobile', 'number', 'contact', 'tel', 'cell', 'ph', 'phone number', 'mobile number'];
const NAME_HEADERS  = ['name', 'contact name', 'full name', 'first name', 'customer', 'customer name'];

function findColIndex(headers: string[], candidates: string[]): number {
  return headers.findIndex(h => candidates.includes(h.toLowerCase().trim()));
}

function parseRows(
  rows: unknown[][]
): { phone: string; name?: string }[] {
  if (rows.length === 0) return [];

  // Detect if first row is a header row
  const firstRow = rows[0].map(normalise);
  const phoneIdx = findColIndex(firstRow, PHONE_HEADERS);
  const nameIdx  = findColIndex(firstRow, NAME_HEADERS);

  let dataRows: unknown[][];
  let pIdx: number;
  let nIdx: number;

  if (phoneIdx !== -1) {
    // Has recognisable headers — skip header row
    dataRows = rows.slice(1);
    pIdx = phoneIdx;
    nIdx = nameIdx;
  } else {
    // No headers — assume col 0 = phone, col 1 = name
    dataRows = rows;
    pIdx = 0;
    nIdx = 1;
  }

  const contacts: { phone: string; name?: string }[] = [];
  for (const row of dataRows) {
    const rawPhone = normalise(row[pIdx]);
    if (!rawPhone) continue;
    const phone = cleanPhone(rawPhone);
    if (!isValidPhone(phone)) continue;
    const name = nIdx >= 0 ? normalise(row[nIdx]) : '';
    contacts.push(name ? { phone, name } : { phone });
  }
  return contacts;
}

// ─── route handler ────────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireApiSession(req);
  if (error) return error;

  const { id } = await params;
  const { error: ownerErr } = await assertCampaignOwner(id, session!);
  if (ownerErr) return ownerErr;

  // Parse multipart form
  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  const filename = file.name.toLowerCase();
  const isExcel = filename.endsWith('.xlsx') || filename.endsWith('.xls');
  const isCsv   = filename.endsWith('.csv');
  if (!isExcel && !isCsv) {
    return NextResponse.json(
      { error: 'Only .csv, .xlsx and .xls files are supported' },
      { status: 400 }
    );
  }

  // Read file bytes
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Parse with SheetJS (handles CSV + Excel)
  let rows: unknown[][];
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer', raw: false });
    const sheet    = workbook.Sheets[workbook.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
  } catch {
    return NextResponse.json({ error: 'Could not parse file — check it is a valid CSV or Excel file' }, { status: 400 });
  }

  const contacts = parseRows(rows);
  if (contacts.length === 0) {
    return NextResponse.json(
      { error: 'No valid phone numbers found. Make sure the file has a column with phone numbers.' },
      { status: 400 }
    );
  }

  // Total rows attempted (excluding blank/invalid)
  const totalRows = rows.filter(r => normalise(r[0])).length;
  const skipped   = Math.max(0, totalRows - contacts.length - 1); // -1 for potential header

  await addContacts(id, contacts);

  return NextResponse.json({
    added:   contacts.length,
    skipped,
    sample:  contacts.slice(0, 3).map(c => c.name ? `${c.phone} (${c.name})` : c.phone),
  }, { status: 201 });
}
