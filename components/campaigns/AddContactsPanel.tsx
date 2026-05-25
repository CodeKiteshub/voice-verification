'use client';
import { useRef, useState } from 'react';
import { Upload, UserPlus, X, CheckCircle } from 'lucide-react';

interface AddContactsPanelProps {
  campaignId: string;
  onAdded: () => void; // refresh contacts list
}

type Tab = 'manual' | 'file';

export function AddContactsPanel({ campaignId, onAdded }: AddContactsPanelProps) {
  const [open,    setOpen]    = useState(false);
  const [tab,     setTab]     = useState<Tab>('manual');
  const [raw,     setRaw]     = useState('');
  const [file,    setFile]    = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState<{ added: number; skipped: number; sample: string[] } | null>(null);
  const [error,   setError]   = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // ── parsed preview for manual tab ────────────────────────────────────────
  const parsed = raw
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .map(line => {
      const parts = line.split(',');
      return { phone: parts[0].trim(), name: parts[1]?.trim() };
    })
    .filter(c => c.phone);

  // ── submit manual ─────────────────────────────────────────────────────────
  async function submitManual() {
    if (!parsed.length) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts: parsed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to add contacts');
      setResult({ added: data.added, skipped: 0, sample: parsed.slice(0, 3).map(c => c.name ? `${c.phone} (${c.name})` : c.phone) });
      setRaw('');
      onAdded();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // ── submit file ───────────────────────────────────────────────────────────
  async function submitFile() {
    if (!file) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`/api/campaigns/${campaignId}/contacts/upload`, {
        method: 'POST',
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Upload failed');
      setResult(data);
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      onAdded();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setOpen(false); setRaw(''); setFile(null);
    setResult(null); setError(''); setLoading(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <div className="mt-3">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 text-sm text-indigo-600 font-medium hover:text-indigo-800 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Add more contacts
        </button>
      ) : (
        <div className="border border-indigo-200 rounded-xl bg-indigo-50/40 p-4 space-y-4">
          {/* header */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-800">Add Contacts</p>
            <button onClick={reset} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* tabs */}
          <div className="flex gap-1 bg-white border border-gray-200 rounded-lg p-1 w-fit">
            {(['manual', 'file'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(''); setResult(null); }}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  tab === t
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t === 'manual' ? 'Type / Paste' : 'Upload File'}
              </button>
            ))}
          </div>

          {/* ── manual tab ── */}
          {tab === 'manual' && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500">
                One number per line. Optionally add a name after a comma.
              </p>
              <textarea
                value={raw}
                onChange={e => { setRaw(e.target.value); setResult(null); setError(''); }}
                rows={5}
                placeholder={'+919876543210\n+919876543211, Ravi\n+919876543212, Priya'}
                className="w-full rounded-lg border-gray-300 shadow-sm text-sm font-mono focus:border-indigo-500 focus:ring-indigo-500"
              />
              {parsed.length > 0 && (
                <p className="text-xs text-indigo-600 font-medium">{parsed.length} number{parsed.length !== 1 ? 's' : ''} ready to add</p>
              )}
              <button
                onClick={submitManual}
                disabled={loading || parsed.length === 0}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Adding…' : `Add ${parsed.length || ''} Contact${parsed.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          )}

          {/* ── file tab ── */}
          {tab === 'file' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                Upload a <strong>.csv</strong>, <strong>.xlsx</strong> or <strong>.xls</strong> file.
                Include a column named <em>Phone</em> (or Mobile / Number) and optionally a <em>Name</em> column.
                If there are no headers, the first column is used as phone and the second as name.
              </p>

              {/* drop zone */}
              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-xl px-4 py-6 cursor-pointer hover:border-indigo-400 hover:bg-white transition-colors">
                <Upload className="w-6 h-6 text-gray-400" />
                <span className="text-sm text-gray-500">
                  {file ? file.name : 'Click to choose a file or drag & drop'}
                </span>
                {file && (
                  <span className="text-xs text-grayigo-400">
                    {(file.size / 1024).toFixed(1)} KB
                  </span>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={e => { setFile(e.target.files?.[0] ?? null); setError(''); setResult(null); }}
                />
              </label>

              <button
                onClick={submitFile}
                disabled={loading || !file}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Uploading…' : 'Upload & Import'}
              </button>
            </div>
          )}

          {/* error */}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          {/* success */}
          {result && (
            <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
              <div className="text-sm text-green-800">
                <p className="font-medium">
                  {result.added} contact{result.added !== 1 ? 's' : ''} added
                  {result.skipped > 0 ? `, ${result.skipped} skipped (invalid)` : ''}
                </p>
                {result.sample.length > 0 && (
                  <p className="text-xs text-green-700 mt-0.5 font-mono">{result.sample.join(' · ')}{result.added > 3 ? ' …' : ''}</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
