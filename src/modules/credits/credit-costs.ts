import { PlanCapability } from '../billing/entities/plan.entity';

/**
 * Tabela central de custos em créditos por ação.
 * Manter aqui e referenciar via CREDIT_COSTS.X — nunca hard-coded em controllers.
 */
export const CREDIT_COSTS = {
  CHAT_ASK_ONE: 1,
  CHAT_ASK_ALL: 4,
  GAME_ACTION: 1,
  RPG_TURN: 3,
  RAP_VERSE_TEXT: 2,
  TTS_RESPONSE: 5,
  MUSIC_GEN: 15,
} as const;

export type CreditAction = keyof typeof CREDIT_COSTS;

/** Mapeamento ação → capability necessária do plano. */
export const ACTION_CAPABILITY: Record<CreditAction, PlanCapability> = {
  CHAT_ASK_ONE: 'chat',
  CHAT_ASK_ALL: 'chat',
  GAME_ACTION: 'games',
  RPG_TURN: 'games',
  RAP_VERSE_TEXT: 'games',
  TTS_RESPONSE: 'audio',
  MUSIC_GEN: 'music',
};

export const ROLES_EXEMPT_FROM_CHARGE = ['admin', 'beta_tester'] as const;
