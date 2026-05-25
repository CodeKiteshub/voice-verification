'use client';
import { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload, UserPlus, X, Trash2, Plus, CheckCircle } from 'lucide-react';

interface ParsedContact {
  phone: string;
  name: string;
  _key: number; // stable local key for React
}

interface AddContactsPanelProps {
  campaignId: string;
  onAdded: () => void;
}

// ─── parsing helpers ──────────────────────────────────────────────────────────

let _keySeq = 0;
const makeKey = () => ++_keySeq;

const PHONE_HEADERS = ['phone', 'mobile', 'number', 'contact', 'tel', 'cell', 'ph', 'phone number', 'mobile number'];
const NAME_HEADERS  = ['name', 'contact name', 'full name', 'first name', 'customer', 'customer name'];

function findColIdx(headers: string[], candidates: string[]) {
  return headers.findIndex(h => candidates.includes(h.toLowerCase().trim()));
}

function isValidPhone(s: string) {
  const d = s.replace(/\D/g, '');
  return d.length >= 7 && d.length <= 15;
}

function cleanPhone(s: string) {
  return s.replace(/[^\d+\s]/g, '').trim();
}

/** Parse a 2-D array of rows (from SheetJS or manual split) into contacts */
function rowsToContacts(rows: string[][]): ParsedContact[] {
  if (!rows.length) return [];

  const first = rows[0].map(c => c.toLowerCase().trim());
  const pIdx  = findColIdx(first, PHONE_HEADERS);
  const nIdx  = findColIdx(first, NAME_HEADERS);

  let dataRows: string[][];
  let pi: number, ni: number;

  if (pIdx !== -1) {
    dataRows = rows.slice(1); pi = pIdx; ni = nIdx;
  } else {
    dataRows = rows; pi = 0; ni = 1;
  }

  return dataRows
    .map(row => ({ raw: (row[pi] ?? '').trim(), name: (ni >= 0 ? row[ni] ?? '' : '').trim() }))
    .filter(r => r.raw)
    .map(r => ({ phone: cleanPhone(r.raw), name: r.name }))
    .filter(r => isValidPhone(r.phone))
    .map(r => ({ ...r, _key: makeKey() }));
}

/** Parse textarea text (one per line, optional comma-name) */
function parseText(text: string): ParsedContact[] {
  const rows = text
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .map(l => l.split(',').map(p => p.trim()));
  return rowsToContacts(rows);
}

/** Parse CSV / Excel ArrayBuffer using SheetJS */
async function parseFile(file: File): Promise<ParsedContact[]> {
  const buf      = await file.arrayBuffer();
  const workbook = XLSX.read(buf, { type: 'array', raw: false });
  const sheet    = workbook.Sheets[workbook.SheetNames[0]];
  const rows     = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' });
  return rowsToContacts(rows as string[][]);
}

// ─── component ────────────────────────────────────────────────────────────────

type Step = 'input' | 'review';
type Tab  = 'paste' | 'file';

export function AddContactsPanel({ campaignId, onAdded }: AddContactsPanelProps) {
  const [open,     setOpen]     = useState(false);
  const [step,     setStep]     = useState<Step>('input');
  const [tab,      setTab]      = useState<Tab>('paste');

  // input step state
  const [raw,      setRaw]      = useState('');
  const [fileName, setFileName] = useState('');
  const [parseErr, setParseErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // review step state
  const [contacts, setContacts] = useState<ParsedContact[]>([]);
  const [addLine,  setAddLine]  = useState(''); // quick-add input in review

  // submit state
  const [saving,   setSaving]   = useState(false);
  const [saveErr,  setSaveErr]  = useState('');
  const [done,     setDone]     = useState(false);

  // ── navigation ──────────────────────────────────────────────────────────────
  function openModal()  { setOpen(true); setStep('input'); setDone(false); }
  function closeModal() {
    setOpen(false); setRaw(''); setFileName(''); setParseErr('');
    setContacts([]); setAddLine(''); setSaveErr(''); setDone(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  // ── parse actions ───────────────────────────────────────────────────────────
  function handleParseText() {
    const parsed = parseText(raw);
    if (!parsed.length) { setParseErr('No valid phone numbers found.'); return; }
    setParseErr('');
    setContacts(parsed);
    setStep('review');
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParseErr('');
    try {
      const parsed = await parseFile(file);
      if (!parsed.length) { setParseErr('No valid phone numbers found in the file.'); return; }
      setContacts(parsed);
      setStep('review');
    } catch {
      setParseErr('Could not read file. Please check it is a valid CSV or Excel file.');
    }
  }

  // ── review actions ──────────────────────────────────────────────────────────
  function removeContact(key: number) {
    setContacts(prev => prev.filter(c => c._key !== key));
  }

  function handleAddLine() {
    const line = addLine.trim();
    if (!line) return;
    const parsed = parseText(line);
    if (!parsed.length) return;
    setContacts(prev => [...prev, ...parsed]);
    setAddLine('');
  }

  function updateContact(key: number, field: 'phone' | 'name', value: string) {
    setContacts(prev => prev.map(c => c._key === key ? { ...c, [field]: value } : c));
  }

  // ── submit ──────────────────────────────────────────────────────────────────
  async function handleConfirm() {
    const valid = contacts.filter(c => isValidPhone(c.phone));
    if (!valid.length) { setSaveErr('No valid contacts to add.'); return; }
    setSaving(true); setSaveErr('');
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts: valid.map(c => ({ phone: c.phone, ...(c.name ? { name: c.name } : {}) })) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      setDone(true);
      onAdded();
      setTimeout(closeModal, 1800);
    } catch (e: any) {
      setSaveErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  const validCount = contacts.filter(c => isValidPhone(c.phone)).length;

  return (
    <>
      {/* trigger button */}
      <div className="mt-3">
        <button
          onClick={openModal}
          className="flex items-center gap-1.5 text-sm text-indigo-600 font-medium hover:text-indigo-800 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Add more contacts
        </button>
      </div>

      {/* modal backdrop */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">

            {/* ── modal header ── */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  {step === 'input' ? 'Import Contacts' : `Review Contacts (${contacts.length})`}
                </h2>
                {step === 'review' && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    Edit or remove before confirming. Invalid numbers are skipped.
                  </p>
                )}
              </div>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-700 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* ── step: input ── */}
            {step === 'input' && (
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {/* tabs */}
                <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
                  {(['paste', 'file'] as Tab[]).map(t => (
                    <button
                      key={t}
                      onClick={() => { setTab(t); setParseErr(''); }}
                      className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        tab === t ? 'bg-white shadow text-indigo-700' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {t === 'paste' ? 'Type / Paste' : 'Upload File'}
                    </button>
                  ))}
                </div>

                {tab === 'paste' && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500">
                      One number per line. Optionally add a name: <span className="font-mono">+91XXXXXXXXXX, Name</span>
                    </p>
                    <textarea
                      value={raw}
                      onChange={e => { setRaw(e.target.value); setParseErr(''); }}
                      rows={7}
                      placeholder={'+919876543210\n+919876543211, Ravi Sharma\n+919876543212, Priya Mehta'}
                      className="w-full rounded-lg border-gray-300 shadow-sm text-sm font-mono focus:border-indigo-500 focus:ring-indigo-500"
                    />
                    {raw.split('\n').filter(l => l.trim()).length > 0 && (
                      <p className="text-xs text-indigo-600 font-medium">
                        ~{raw.split('\n').filter(l => l.trim()).length} line{raw.split('\n').filter(l => l.trim()).length !== 1 ? 's' : ''} entered
                      </p>
                    )}
                  </div>
                )}

                {tab === 'file' && (
                  <div className="space-y-3">
                    <p className="text-xs text-gray-500">
                      Accepts <strong>.csv</strong>, <strong>.xlsx</strong>, <strong>.xls</strong>.
                      Include a <em>Phone</em> column (or Mobile / Number) and optionally a <em>Name</em> column.
                      No headers? First column = phone, second = name.
                    </p>
                    <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-xl px-4 py-8 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-colors">
                      <Upload className="w-7 h-7 text-gray-400" />
                      <span className="text-sm text-gray-500 text-center">
                        {fileName || 'Click to choose or drag & drop your file'}
                      </span>
                      <span className="text-xs text-gray-400">CSV, Excel (.xlsx / .xls)</span>
                      <input
                        ref={fileRef}
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </label>
                  </div>
                )}

                {parseErr && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{parseErr}</p>
                )}
              </div>
            )}

            {/* ── step: review ── */}
            {step === 'review' && (
              <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
                {done ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-10">
                    <CheckCircle className="w-10 h-10 text-green-500" />
                    <p className="text-sm font-semibold text-green-700">{validCount} contact{validCount !== 1 ? 's' : ''} added!</p>
                  </div>
                ) : (
                  <>
                    {/* contacts list */}
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="bg-gray-50 px-3 py-2 grid grid-cols-[1fr_1fr_auto] gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                        <span>Phone</span>
                        <span>Name</span>
                        <span />
                      </div>
                      <ul className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
                        {contacts.map(c => (
                          <li key={c._key} className="px-3 py-2 grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                            <input
                              type="text"
                              value={c.phone}
                              onChange={e => updateContact(c._key, 'phone', e.target.value)}
                              className={`text-sm font-mono border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400 ${
                                isValidPhone(c.phone) ? 'border-gray-200' : 'border-red-300 bg-red-50'
                              }`}
                            />
                            <input
                              type="text"
                              value={c.name}
                              onChange={e => updateContact(c._key, 'name', e.target.value)}
                              placeholder="—"
                              className="text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400 text-gray-600"
                            />
                            <button
                              onClick={() => removeContact(c._key)}
                              className="text-gray-300 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* quick-add row */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={addLine}
                        onChange={e => setAddLine(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddLine()}
                        placeholder="+91XXXXXXXXXX, Name (optional)"
                        className="flex-1 text-sm font-mono border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                      <button
                        onClick={handleAddLine}
                        className="p-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors"
                        title="Add"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    {contacts.length === 0 && (
                      <p className="text-sm text-gray-400 text-center">All contacts removed. Add some above or go back.</p>
                    )}

                    {saveErr && (
                      <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{saveErr}</p>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── modal footer ── */}
            {!done && (
              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
                {step === 'review' ? (
                  <>
                    <button
                      onClick={() => setStep('input')}
                      className="text-sm text-gray-500 hover:text-gray-700 font-medium"
                    >
                      ← Back
                    </button>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{validCount} valid contact{validCount !== 1 ? 's' : ''}</span>
                      <button
                        onClick={handleConfirm}
                        disabled={saving || validCount === 0}
                        className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                      >
                        {saving ? 'Adding…' : `Confirm & Add ${validCount}`}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <button onClick={closeModal} className="text-sm text-gray-500 hover:text-gray-700 font-medium">
                      Cancel
                    </button>
                    {tab === 'paste' && (
                      <button
                        onClick={handleParseText}
                        disabled={!raw.trim()}
                        className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                      >
                        Preview Contacts →
                      </button>
                    )}
                    {tab === 'file' && (
                      <span className="text-xs text-gray-400 italic">Select a file to continue</span>
                    )}
                  </>
                )}
              </div>
            )}

          </div>
        </div>
      )}
    </>
  );
}
