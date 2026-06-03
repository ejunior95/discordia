---
description: "Adiciona um novo contexto de jogo ao discordIA (backend + frontend) sem esquecer constantes, DTOs, prompts, stats, navegação e FeatureGate."
argument-hint: "Nome do contexto novo (ex.: tic-tac-toe)"
agent: "agent"
---

# Adicionar novo contexto de jogo

Use este prompt quando precisar introduzir um novo `context` no produto. O nome do contexto vem no argumento (`$ARGUMENTS`); se vazio, peça ao usuário antes de prosseguir.

Siga a ordem abaixo e marque cada item como feito. Não pule nenhuma etapa que toque contratos compartilhados.

## Pré-checagem

- Confirme o slug definitivo (kebab-case, sem espaços).
- Confirme capability de plano (`chat` | `games` | `audio` | `music`).
- Confirme se haverá `game_id` (partida/campanha) ou se cada round é independente.

## Backend (`discordia/`)

1. `src/shared/global.service.ts`
   - Adicionar slug em `ALLOWED_CONTEXTS`.
   - Garantir que `GameActionContext` permaneça `ChatContext` exceto `chat`.
2. `src/dtos/app.dtos.ts`
   - `GameActionDto` aceita o novo context automaticamente; validar payload novo no builder.
3. `src/utils/gamePromptBuilders.ts`
   - Adicionar branch no switch de `buildGameActionPrompt`.
   - Adicionar branch em `summarizeGameAction`.
   - Adicionar branch em `extractGameMeta` (pelo menos `gameId` se houver partida).
   - Atualizar `dynamicMaxTokens` e `dynamicTemperature` em `getCustomContent.ts` se necessário.
4. `src/modules/stats/stats.service.ts`
   - Incluir slug em `GAME_CONTEXTS`.
   - Adicionar rótulo em `GAME_LABELS`.
   - Atualizar `computeTotals` (decidir entre `miniGames` ou contagem por `game_id`).
   - Atualizar `formatGameActivity` para o feed de atividade recente.
   - Atualizar `recompute()` se a nova métrica entrar em `totals`.
5. `src/app.service.ts`
   - Garantir que `askGameAction` cubra o novo context (cobrança, persistência de Round/History, audio se aplicável).
6. Lint + testes:
   - `pnpm run lint`
   - `pnpm run test`
   - Atualizar `gamePromptBuilders.spec.ts` se houver invariantes novas (tokens, temperatura).

## Frontend (`discordia-front/`)

1. `src/services/main.service.ts`
   - Adicionar slug ao union de `OrchestratorContextKind` / `GameActionContext`.
2. `src/features/<novo>/`
   - Criar feature com `hooks/`, `components/`, `types.ts`, `constants.ts` (storage key única).
   - Usar `askGameAction(slug, agent, payload, signal?)` para chamadas.
   - Aceitar `AbortSignal` em requests longos.
   - Sanitizar estados `loading` ao restaurar de `localStorage`.
3. `src/pages/`
   - Criar página `lazy()`-loaded.
4. `src/App.tsx`
   - Registrar rota dentro de `ProtectedRoute` + `FeatureGate` correto.
5. `src/config/navigation.ts`
   - Adicionar item de navegação com `requiresCapability` apropriado.
6. `src/features/home/components/StatsOverview.tsx`
   - Se for métrica nova em `totals`, adicionar card.
7. `src/features/home/home.types.ts`
   - Atualizar `HomeTotals` e `RecentActivityKind` se aplicável.
8. Lint:
   - `pnpm run lint`

## Cross-cutting

- Custos de crédito vão em [discordia/src/modules/credits/credit-costs.ts](../../src/modules/credits/credit-costs.ts) — nunca hard-code.
- Capabilities atuais: `chat`, `games`, `audio`, `music`. Para mudar capability do contexto, atualizar `ACTION_CAPABILITY`.
- Stats: ver skill `discordia-vote-flow` para confiar na regra de vitória.
- Se o contexto exigir áudio/música, leia também `rap-battle.instructions.md` ou as regras de RPG/TTS.

## Saída esperada

Ao final, apresente:

1. Lista de arquivos criados/alterados (com links).
2. Resultado dos comandos de lint/test.
3. Pontos pendentes que dependem de decisão de produto (ex.: copy, ícones).
