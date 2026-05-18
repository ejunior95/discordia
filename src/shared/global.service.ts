export const ALLOWED_AGENTS = [
  'deepseek',
  'gemini',
  'chat-gpt',
  'grok',
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

export type AgentName = (typeof ALLOWED_AGENTS)[number];
export type ChatContext = (typeof ALLOWED_CONTEXTS)[number];

export function isAgentName(value: unknown): value is AgentName {
  return (
    typeof value === 'string' &&
    (ALLOWED_AGENTS as readonly string[]).includes(value)
  );
}

export function isChatContext(value: unknown): value is ChatContext {
  return (
    typeof value === 'string' &&
    (ALLOWED_CONTEXTS as readonly string[]).includes(value)
  );
}
