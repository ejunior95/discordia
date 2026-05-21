export const ALLOWED_AGENTS = [
  'deepseek',
  'gemini',
  'chat-gpt',
  'grok',
] as const;

export const ALLOWED_AGENTS_MODELS = [
  'deepseek-v4-pro',
  'deepseek-v4-flash',
  'gemini-3.1-flash-lite',
  'gpt-5.4',
  'grok-4.3',
] as const;

export const ALLOWED_CONTEXTS = [
  'chat',
  'chess',
  'hangman-chooser',
  'hangman-guesser',
  'jokenpo',
  'rpg',
  'rap-battle',
] as const;

export type AgentModel = (typeof ALLOWED_AGENTS_MODELS)[number];
export type AgentName = (typeof ALLOWED_AGENTS)[number];
export type ChatContext = (typeof ALLOWED_CONTEXTS)[number];

export function isAgentName(value: unknown): value is AgentName {
  return (
    typeof value === 'string' &&
    (ALLOWED_AGENTS as readonly string[]).includes(value)
  );
}

export function isAgentModel(value: unknown): value is AgentModel {
  return (
    typeof value === 'string' &&
    (ALLOWED_AGENTS_MODELS as readonly string[]).includes(value)
  );
}

export function isChatContext(value: unknown): value is ChatContext {
  return (
    typeof value === 'string' &&
    (ALLOWED_CONTEXTS as readonly string[]).includes(value)
  );
}
