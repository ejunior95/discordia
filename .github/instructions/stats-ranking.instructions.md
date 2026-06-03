---
description: "Use when alterar StatsService, entidade Stats/Round, contagem de votos, snapshot da home (/stats/home), recompute ou qualquer regra de ranking/leaderboard das IAs."
applyTo: "discordia/src/modules/stats/**,discordia/src/entities/stats.entity.ts,discordia/src/entities/round.entity.ts"
---

# Stats e Ranking (backend)

Regras que NÃO estão em `copilot-instructions.md` e que costumam ser quebradas em mudanças no domínio de estatísticas.

## Regra de ouro do ranking

- `wins` por agente **só** aumenta quando `POST /rounds/:id/vote` é chamado com sucesso (via `StatsService.incrementOnVote`).
- Ações de jogo (`POST /ai/game-action`) entram em `rounds` / `gamesRounds` / `rpgBattles` / `rapBattles` via `incrementOnGameAction`, mas **nunca** em `wins`.
- Round sem `winner_agent` + `voted_at` é participação, não vitória. Não conte como vitória em UI nem em métricas derivadas.

## Escopos do snapshot

`GET /stats/home` aceita `?scope=user`:

- **Global** (sem `scope`): leaderboard e `weekly` vêm do documento agregado `Stats` (`scope: 'global'`), mantido incrementalmente. `totals` é recomputado dos rounds globais.
- **User** (`scope=user`): leaderboard e `weekly` são recomputados a partir dos `rounds` do `user_id` atual. Não use o doc agregado nesse caminho.

`iaOfWeek` e `recent` são sempre derivados dos rounds do escopo.

## Contextos contabilizados

`GAME_CONTEXTS` em `stats.service.ts` define quais `context` contam como "game" para `gameVotes` e mini-games: `rpg`, `rap-battle`, `chess`, `jokenpo`, `hangman-chooser`, `hangman-guesser`.

- `rap-battle` / `rpg` agrupam por `game_id` em `computeTotals` (1 entrada por batalha/campanha, não por turno).
- `chess`, `jokenpo`, `hangman-*` contam como `miniGames` (1 por round/ação).
- Sem `context` ou `context === 'chat'` cai em `questions` e em `chatVotes`.

Ao adicionar um novo contexto de jogo, atualize: `GAME_CONTEXTS`, `GAME_LABELS`, `computeTotals`, `recompute()` e o tipo `HomeTotals` no frontend.

## Streak

`streak` é por agente e **sequencial no tempo**: incrementa quando o mesmo agente vence dois votos seguidos; zera para todos os demais agentes a cada novo vencedor. O recompute reproduz isso ordenando rounds por `voted_at`.

## Recompute

`POST /stats/recompute` reconstrói o doc agregado a partir de `Round` + `History`:

- Use quando alterar a forma de contar (campos em `totals`, regras de `GAME_CONTEXTS`, novo agente).
- Mantenha `recompute()` sincronizado com `incrementOnNewRound`, `incrementOnGameAction` e `incrementOnVote` — divergência produz números diferentes entre tempo real e recompute.
- `gamesRounds`/`rpgBattles`/`rapBattles` no recompute vêm de `History` (assistant) com `context` em `GAME_CONTEXTS`; ao mudar a fonte, ajuste os dois lados.

## Contrato com o frontend

`HomeSnapshot` em `discordia-front/src/features/home/home.types.ts` precisa casar exatamente com o retorno de `getHomeSnapshot`. Ao alterar `totals`, `leaderboard`, `iaOfWeek`, `weekly` ou `recent`, atualize:

- tipos do front;
- componentes em `discordia-front/src/features/home/components/*`;
- `LeaderboardCard` consome `wins`, `rounds`, `streak` (>=3 mostra chama). Outros campos (`votes`, `lastWinAt`) existem no tipo mas não são exibidos hoje — não dependa de alterações invisíveis.

## Erros comuns

- Contar vitória dentro de `askGameAction` (errado: voto define vencedor).
- Esquecer de passar `context` para `incrementOnVote` — quebra `chatVotes` vs `gameVotes`.
- Filtrar rounds só por `winner_agent` sem checar `voted_at` (ou vice-versa) — ambos são obrigatórios para considerar voto válido.
- Recriar leaderboard "global" a partir dos rounds: o caminho global deve usar o doc agregado por performance.
