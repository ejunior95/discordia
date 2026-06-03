---
description: "Use when adicionar/alterar ação cobrada, modificar planos, seeds de billing, CreditsService, CreditsGuard, CreditsRefundInterceptor, RequiresCredits ou qualquer regra de capability/crédito no backend."
applyTo: "discordia/src/modules/credits/**,discordia/src/modules/billing/**"
---

# Créditos e Billing (backend)

Complementa `copilot-instructions.md`. Foco em regras que costumam ser quebradas em alterações dessa área.

## Lei de ouro

**Custos e capabilities por ação existem em um único lugar:**
`discordia/src/modules/credits/credit-costs.ts` — `CREDIT_COSTS` e `ACTION_CAPABILITY`.
Nunca hard-code valor numérico de crédito ou capability string fora desse arquivo.

## Stack obrigatória para rotas cobradas

```ts
@UseGuards(AuthGuard('jwt'), CreditsGuard)
@UseInterceptors(CreditsRefundInterceptor)
@RequiresCredits('NOME_DA_ACTION')
```

Os três decorators sempre juntos, nessa ordem. Sem um deles o fluxo fica incompleto:

- Sem `CreditsGuard`: cobrança não acontece e `req.creditTx` não é preenchido.
- Sem `CreditsRefundInterceptor`: erro no handler não estorna o crédito já cobrado.
- Sem `@RequiresCredits`: `CreditsGuard` não encontra metadata e passa sem cobrar.

## Quando usar refund manual em vez de `CreditsRefundInterceptor`

`CreditsRefundInterceptor` cobre fluxos **simples** (cobra → executa → erro → estorna). Use **refund manual** quando há múltiplos passos assíncronos com suas próprias cobranças após a do guard:

- RPG TTS: `@RequiresCredits('GAME_ACTION')` no controller + `charge('TTS_RESPONSE')` + `refund('TTS_RESPONSE')` manual no `try/catch` dentro do service.
- Rap Battle: `@RequiresCredits('GAME_ACTION')` no controller + `charge('MUSIC_GEN')` + `refund('MUSIC_GEN')` manual em falha de submissão Sunor.

Em fluxos multi-etapa, lembre que `CreditsRefundInterceptor` só estorna a cobrança do guard (`GAME_ACTION`); as cobranças internas precisam de catch explícito.

## Roles isentas

`admin` e `beta_tester` nunca são debitados. `CreditsGuard` detecta automaticamente pelo campo `user.role` e registra transação tipo `role_exempt` (amount = 0). Não faça verificação de role adicional em controller ou service para pular cobrança.

## Exceções esperadas

| Status | Código | Quando |
|--------|--------|--------|
| 402 | `INSUFFICIENT_CREDITS` | `creditsService.charge()` com saldo < amount |
| 403 | `FEATURE_NOT_ALLOWED` | `CreditsGuard` detecta capability ausente no plano |

Campos extras no body: 402 inclui `{ balance, required }`; 403 inclui `{ capability, planSlug }`. O frontend já trata ambos com toast + link de upgrade — não adicione tratamento duplicado.

## Planos

- Slugs válidos: `free`, `basic`, `premium`. Não use `pro` em código novo.
- Capabilities válidas: `chat`, `games`, `audio`, `music`.
- `BillingService.seedDefaultPlans()` faz upsert idempotente. Ao alterar um plano, ajuste o seed e rode-o — o seed migra `pro → basic` automaticamente.
- `ensureFreeSubscription(userId)` cria assinatura Free se o usuário não tem nenhuma ativa. `getActiveSubscription` chama isso internamente — não precisa chamar manualmente antes.

## Endpoint `GET /auth/me`

Enriquece o usuário com `plan` (slug, capabilities, monthlyCredits, unlimitedSoftCap) e `credits` (balance, monthlyAllowance, isUnlimited, periodEnd). Qualquer campo adicionado aqui deve ser espelhado em `CurrentUser` / `UserPlan` / `UserCredits` no frontend.

## Wallet e transações

- `charge` é atômico via `findOneAndUpdate` com filtro `balance >= amount` — race-condition safe.
- `refund` só funciona em transações do tipo `debit`; silencioso para outros tipos.
- `idempotency_key` evita cobranças duplicadas em retry — use quando o mesmo roundId puder reprocessar.
- Append-only: nunca delete nem edite transações. Auditoria depende disso.

## Erros comuns

- Usar `@RequiresCredits` sem `CreditsGuard` na lista de guards.
- Esquecer `CreditsRefundInterceptor` em rota com charge atômico.
- Cobrar no service sem guard + interceptor → crédito preso se handler falha.
- Usar refund manual onde `CreditsRefundInterceptor` já basta (duplica estorno).
- Adicionar custo novo sem atualizar `ACTION_CAPABILITY` → capability nunca validada.
- Hard-code de valor (ex.: `charge(userId, { amount: 4, ... })`) fora de `CREDIT_COSTS`.
