'use client';
import { useState } from 'react';
import { PlusCircle, Trash2, GripVertical } from 'lucide-react';
import type { AgentConfig, AgentQuestion } from '@/lib/types';

interface AgentConfigFormProps {
  value: AgentConfig;
  onChange: (config: AgentConfig) => void;
}

function newQuestion(order: number): AgentQuestion {
  return { id: crypto.randomUUID(), text: '', order };
}

export function AgentConfigForm({ value, onChange }: AgentConfigFormProps) {
  const update = (patch: Partial<AgentConfig>) => onChange({ ...value, ...patch });

  const updateQuestion = (id: string, text: string) => {
    onChange({
      ...value,
      questions: value.questions.map(q => q.id === id ? { ...q, text } : q),
    });
  };

  const addQuestion = () => {
    if (value.questions.length >= 10) return;
    const nextOrder = Math.max(0, ...value.questions.map(q => q.order)) + 1;
    onChange({ ...value, questions: [...value.questions, newQuestion(nextOrder)] });
  };

  const removeQuestion = (id: string) => {
    if (value.questions.length <= 1) return;
    const remaining = value.questions
      .filter(q => q.id !== id)
      .map((q, i) => ({ ...q, order: i + 1 }));
    onChange({ ...value, questions: remaining });
  };

  const kbLen = value.knowledge_base?.length ?? 0;

  return (
    <div className="space-y-5">
      {/* Company + Role */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700">Company Name</label>
          <input
            required
            value={value.company_name}
            onChange={e => update({ company_name: e.target.value })}
            placeholder="Acme Corp"
            className="w-full rounded-lg border-gray-300 shadow-sm text-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700">Agent Role</label>
          <input
            required
            value={value.agent_role}
            onChange={e => update({ agent_role: e.target.value })}
            placeholder="Sales Agent"
            className="w-full rounded-lg border-gray-300 shadow-sm text-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* First Message */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-gray-700">
          Opening Message{' '}
          <span className="text-gray-400 font-normal text-xs">
            (optional — supports {'{{contact_name}}'}, {'{{company_name}}'})
          </span>
        </label>
        <input
          value={value.first_message ?? ''}
          onChange={e => update({ first_message: e.target.value || undefined })}
          placeholder="Hello {{contact_name}}, I'm calling from {{company_name}}."
          className="w-full rounded-lg border-gray-300 shadow-sm text-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
      </div>

      {/* Knowledge Base */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-gray-700 flex items-center justify-between">
          <span>Knowledge Base</span>
          <span className={`text-xs font-normal ${kbLen > 2800 ? 'text-amber-600' : 'text-gray-400'}`}>
            {kbLen}/3000
          </span>
        </label>
        <textarea
          required
          value={value.knowledge_base}
          onChange={e => update({ knowledge_base: e.target.value.slice(0, 3000) })}
          rows={5}
          placeholder="Describe your product, service, or context. The agent will use this to answer caller questions."
          className="w-full rounded-lg border-gray-300 shadow-sm text-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
        <p className="text-xs text-gray-400">
          Include product details, FAQs, objection handling — anything the agent may need to discuss.
        </p>
      </div>

      {/* Questions */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">
            Questions to Ask{' '}
            <span className="text-gray-400 font-normal text-xs">
              ({value.questions.length}/10)
            </span>
          </label>
        </div>

        <div className="space-y-2">
          {value.questions
            .sort((a, b) => a.order - b.order)
            .map((q, idx) => (
              <div key={q.id} className="flex items-center gap-2">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 text-xs font-semibold shrink-0">
                  {idx + 1}
                </div>
                <input
                  required
                  value={q.text}
                  onChange={e => updateQuestion(q.id, e.target.value)}
                  placeholder={`Question ${idx + 1}`}
                  className="flex-1 rounded-lg border-gray-300 shadow-sm text-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => removeQuestion(q.id)}
                  disabled={value.questions.length <= 1}
                  className="p-1.5 text-gray-400 hover:text-red-500 disabled:opacity-30 transition-colors"
                  title="Remove question"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
        </div>

        {value.questions.length < 10 && (
          <button
            type="button"
            onClick={addQuestion}
            className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            <PlusCircle size={15} />
            Add question
          </button>
        )}
      </div>
    </div>
  );
}

/** Default empty AgentConfig for new campaigns */
export const defaultAgentConfig = (): AgentConfig => ({
  company_name: '',
  agent_role: '',
  knowledge_base: '',
  questions: [newQuestion(1)],
  first_message: undefined,
});
