import { SetMetadata } from '@nestjs/common';
import { CreditAction } from './credit-costs';

export const REQUIRES_CREDITS_KEY = 'requires_credits';

export interface RequiresCreditsMeta {
  action: CreditAction;
}

/**
 * Marca um endpoint como cobrável. Use junto com @UseGuards(AuthGuard('jwt'), CreditsGuard).
 *
 *   @RequiresCredits('CHAT_ASK_ALL')
 *   @Post('/ask-to-all')
 *   async ask(...) { ... }
 *
 * O CreditsGuard:
 *   1) valida que o plano do usuário contém a capability associada à action
 *   2) debita o custo (atomic) ou autoriza (role exempt)
 *   3) anexa { transactionId, charged } em req.creditTx para refund
 */
export const RequiresCredits = (action: CreditAction) =>
  SetMetadata(REQUIRES_CREDITS_KEY, { action } satisfies RequiresCreditsMeta);
