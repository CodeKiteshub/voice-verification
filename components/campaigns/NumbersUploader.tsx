'use client';
import { useState } from 'react';

interface Contact { phone: string; name?: string; }

export function NumbersUploader({ onChange }: { onChange: (contacts: Contact[]) => void }) {
  const [raw, setRaw] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setRaw(text);
    const contacts = text
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)
      .map(line => {
        const parts = line.split(',');
        return { phone: parts[0].trim(), name: parts[1]?.trim() };
      });
    onChange(contacts);
  };

  const count = raw.split('\n').filter(l => l.trim()).length;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Phone Numbers
        <span className="ml-2 text-xs text-gray-400">(one per line, or phone,name CSV)</span>
      </label>
      <textarea
        value={raw}
        onChange={handleChange}
        rows={6}
        placeholder={"+919876543210\n+919876543211, Alice\n+919876543212, Bob"}
        className="w-full rounded-lg border-gray-300 shadow-sm text-sm font-mono focus:border-indigo-500 focus:ring-indigo-500"
      />
      {count > 0 && (
        <p className="text-xs text-green-600 font-medium">{count} number{count !== 1 ? 's' : ''} parsed</p>
      )}
    </div>
  );
}
