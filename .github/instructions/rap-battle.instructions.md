---
description: "Use when implementar/alterar batalha de rima no backend: askGameAction com context rap-battle, geração/polling de música Sunor, cobrança/refund MUSIC_GEN, persistência de Round/History."
applyTo: "discordia/src/modules/music-generation/**,discordia/src/utils/gamePromptBuilders.ts,discordia/src/utils/getCustomContent.ts"
---

# Rap Battle (backend)

Pipeline específico do contexto `rap-battle`. Complementa `copilot-instructions.md`.

## Fluxo de um turno

`AppService.askGameAction('rap-battle', agent, payload, userId)`:

1. Resolve provider, monta prompt via `buildGameActionPrompt('rap-battle', agent, payload)`.
2. Persiste `History` (user summary) e `Round` com `context='rap-battle'`, `game_id = payload.battleId`, `theme`, `responses=[{agent, content}]`, `winner_agent=null`.
3. `incrementOnGameAction('rap-battle', agent)` atualiza `rapBattles`/`gamesRounds`.
4. Cobra `CREDIT_COSTS.MUSIC_GEN` (action `MUSIC_GEN`).
5. `musicGenerationService.createRapVerseTask(verse, theme, userId)` submete à Sunor:
   - sucesso → `{ musicTaskId, musicStatus: 'pending' }`;
   - falha de submissão → `{ musicStatus: 'failed', musicError }` + **refund** do `MUSIC_GEN`.
6. Retorna `{ [agent]: { response, audio: { musicTaskId?, musicStatus, musicError?, creditsCharged? } } }`.

`History` do assistant é salvo **antes** da submissão de música, então a falha de música não apaga o verso.

## Polling

`GET /music/rap-verse/:taskId/status` chama `pollAndFinalize`:

- consulta Sunor, atualiza/grava `audio_url`/`audio_meta` no `History` quando ready;
- estado intermediário retorna `status: 'pending'`;
- estado terminal de falha retorna `status: 'failed'` (já sem refund — música já foi paga e tentada).

Polling NÃO cobra crédito por chamada; é leitura idempotente.

## Estatísticas

- `rapBattles` em `totals` é **único por `game_id`** (uma batalha, não uma resposta). Garanta que rounds da mesma batalha tenham `payload.battleId` igual.
- `incrementOnVote(agent, votedAt, 'rap-battle')` é quem grava `wins` para o agente do verso vencedor.

## Prompt e tokens

- `getCustomContent` define `temperature` 0.8 e `dynamicMaxTokens` >= 5000 para `rap-battle`.
- `gamePromptBuilders.ts` exige `agent`, `opponent`, `theme`, `roundIndex` no payload; versos anteriores são opcionais.
- Teste `gamePromptBuilders.spec.ts` valida que tokens >= 700 para versos completos; não reduza sem justificativa.

## Erros comuns

- Cobrar `MUSIC_GEN` antes de gerar o verso — verso deve existir e ter `response.trim()`.
- Esquecer refund quando `createRapVerseTask` lança antes de chegar à Sunor.
- Persistir round sem `game_id` — quebra a contagem de batalhas distintas em `stats`.
- Reaproveitar `MusicGenerationService` para outros contextos sem revisar tags/duração (`RAP_TAGS`, título "Rap Battle ...").
- Tornar polling autenticado-cobrado: ele é gratuito por design.
