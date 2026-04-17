import type { AgentConfig } from '@/lib/types';

/**
 * Build the system prompt for a conversational AI agent.
 * Injected into the LLM (GPT-4o-mini) on both VAPI and Pipecat engines.
 *
 * The prompt:
 * - Establishes the agent's identity, company, and role
 * - Injects the knowledge base (free text, max 3000 chars)
 * - Lists the ordered questions to ask the caller
 * - Sets conversation rules (one question at a time, short responses, Hindi/English)
 */
export function buildSystemPrompt(
  agentConfig: AgentConfig,
  contactName?: string | null
): string {
  const { company_name, agent_role, knowledge_base, questions, first_message } = agentConfig;

  const callerRef = contactName ? `the caller (${contactName})` : 'the caller';
  const questionsBlock = questions
    .sort((a, b) => a.order - b.order)
    .map((q, i) => `${i + 1}. ${q.text}`)
    .join('\n');

  return `You are ${agent_role} at ${company_name}. You are on a phone call with ${callerRef}.

## Your Role
${agent_role} for ${company_name}. Be professional, friendly, and concise.
Keep your responses SHORT — 1–2 sentences maximum. This is a phone call, not a chat.

## Knowledge Base
${knowledge_base.trim()}

## Your Task
You must ask the caller the following questions in order, one at a time.
Wait for their answer before asking the next question.
When all questions are answered, thank them and say goodbye.

Questions to ask:
${questionsBlock}

## Rules
- Ask ONLY ONE question at a time
- Keep responses under 30 words
- Speak naturally — mix Hindi and English (Hinglish) if the caller prefers it
- Do NOT repeat yourself or apologize excessively
- If the caller goes off-topic, gently redirect them back to the questions
- When all questions are done, say: "Thank you for your time. Have a great day. Goodbye."
- NEVER make up information not in the knowledge base
- NEVER mention you are an AI unless directly asked${
    first_message
      ? `\n\n## Opening Message\nStart the call with: "${resolveTemplate(first_message, company_name, contactName)}"`
      : ''
  }`;
}

/**
 * Resolve template variables in the first_message field.
 * Supported: {{contact_name}}, {{company_name}}
 */
export function resolveTemplate(
  template: string,
  companyName: string,
  contactName?: string | null
): string {
  return template
    .replace(/\{\{contact_name\}\}/g, contactName ?? 'there')
    .replace(/\{\{company_name\}\}/g, companyName);
}

/**
 * Build the first message spoken to the caller.
 * Falls back to a generic greeting if no first_message configured.
 */
export function buildFirstMessage(
  agentConfig: AgentConfig,
  contactName?: string | null
): string {
  if (agentConfig.first_message) {
    return resolveTemplate(agentConfig.first_message, agentConfig.company_name, contactName);
  }
  const greeting = contactName ? `Hello ${contactName}` : 'Hello';
  return `${greeting}, I'm calling from ${agentConfig.company_name}. Do you have a moment to speak?`;
}
