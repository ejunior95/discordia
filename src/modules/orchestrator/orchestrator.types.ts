export type OrchestratorSeverity = 'ok' | 'warn' | 'block';

export const ORCHESTRATOR_TARGET_KINDS = [
  'chat',
  'rap-battle-theme',
  'rpg-campaign-theme',
  'rpg-master-narration',
  'rpg-player-action',
  'hangman-word',
  'hangman-category',
] as const;

export interface OrchestratorVerdict {
  severity: OrchestratorSeverity;
  reason?: string;
}

export type OrchestratorTargetKind = (typeof ORCHESTRATOR_TARGET_KINDS)[number];

export type OrchestratorEndpoint = 'chat' | 'game-action' | 'hangman';
