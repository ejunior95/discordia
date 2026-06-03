---
name: discordia-vote-flow
description: "Use when investigar/alterar como vitórias entram no ranking discordIA, depurar inconsistência entre rounds, votos, stats agregadas e snapshot da home, ou rodar/raciocinar sobre POST /stats/recompute."
---

# discordIA Vote Flow

Procedimento canônico de como uma "vitória" se torna parte do ranking exibido na home (`/stats/home`) e em cards relacionados.

## Quando usar

- Suspeita de leaderboard divergente entre escopo global e usuário.
- Adição/renomeação de contexto de jogo e impacto em stats.
- Mudança na regra de voto, refund, ou em campos de `Stats`/`Round`.
- Decidir se precisa rodar `POST /stats/recompute`.

## Modelo mental

```
askToAll / askGameAction  --->  Round(winner_agent=null)         --->  incrementOnNewRound / incrementOnGameAction
voteOnRound              --->  Round(winner_agent, voted_at)    --->  incrementOnVote(agent, votedAt, context)
                                                                       └──> Stats.byAgent[agent].wins++
                                                                       └──> Stats.totals.votes++ (+chatVotes|gameVotes)
                                                                       └──> Stats.weekly[bucket].byAgent[agent]++
```

Regra inviolável: **sem `winner_agent` + `voted_at`, não há vitória**. Ação de jogo conta como participação/round.

## Escopo do snapshot

| Campo | Global (sem scope) | User (`?scope=user`) |
|-------|---------------------|----------------------|
| `totals` | recomputado de todos os rounds | recomputado dos rounds do user |
| `leaderboard` | doc agregado `Stats.byAgent` | recomputado dos rounds do user |
| `weekly` | `Stats.weekly` (8 buckets) | recomputado dos rounds do user |
| `iaOfWeek` | rounds globais últimos 7 dias | rounds do user últimos 7 dias |
| `recent` | rounds globais | rounds do user |

Diferença implica: divergência entre doc agregado e rounds afeta só o caminho global.

## Contextos válidos

`GAME_CONTEXTS` em `discordia/src/modules/stats/stats.service.ts`:
`rpg`, `rap-battle`, `chess`, `jokenpo`, `hangman-chooser`, `hangman-guesser`. Tudo fora vira `chat`.

Para entrar como `rpgCampaigns` ou `rapBattles` em `totals`, o round precisa ter `game_id` estável (campanha/batalha). Caso contrário, `_id` vira o agrupamento, inflando a contagem.

## Procedimento de auditoria

1. Reproduzir cenário: identificar `userId`, `context`, intervalo de tempo.
2. Inspecionar `rounds`:
   - filtrar por `user_id`, `context`, range de `created_at`;
   - separar votados (`winner_agent != null && voted_at != null`).
3. Comparar com `Stats` (`scope: 'global'`): somar `byAgent.wins` por agente vs total de rounds votados — devem bater.
4. Se divergir, rodar `POST /stats/recompute` (admin) e re-comparar.
5. Se ainda divergir, suspeitar de:
   - context inválido em rounds antigos (sem `context` → cai em chat);
   - `incrementOnVote` chamado sem `context`;
   - rounds duplicados (mesmo `_id`/`game_id`).

## Checklist ao alterar a regra

- [ ] Atualizou `incrementOnNewRound`, `incrementOnGameAction`, `incrementOnVote`?
- [ ] Atualizou `recompute()` com a mesma regra (sob risco de divergência)?
- [ ] Atualizou `computeTotals` / `computeLeaderboardFromRounds` / `computeWeeklyFromRounds` (escopo user)?
- [ ] Sincronizou `HomeSnapshot` em `discordia-front/src/features/home/home.types.ts`?
- [ ] Atualizou `LeaderboardCard` / `StatsOverview` / `IAOfTheWeekCard` se a UI precisar do novo campo?
- [ ] Rodou `pnpm run lint` e `pnpm run test` no backend?

## Recompute

`POST /stats/recompute`:

- reconstrói `byAgent` e `weekly` ordenando rounds por `voted_at` (preserva streak temporal);
- usa `History` (assistant) com `context in GAME_CONTEXTS` para `gamesRounds`/`rpgBattles`/`rapBattles`;
- substitui o doc agregado existente.

Use após: migração de schema, mudança em `GAME_CONTEXTS`, adição de agente, importação em massa de dados.
