---
description: "Use when implementar/alterar RPG no backend: askGameAction com context rpg, TTS ElevenLabs para mestre/jogador IA, refund TTS_RESPONSE, parseRpgCampaign, voice resolution por personagem, updateGameStatus."
applyTo: "discordia/src/utils/gamePromptBuilders.ts,discordia/src/modules/tts/**,discordia/src/app.service.ts"
---

# RPG (backend)

Pipeline específico do contexto `rpg`. Complementa `copilot-instructions.md` e a instructions de stats.

## Fluxo de um turno IA

`AppService.askGameAction('rpg', agent, { campaign }, userId)`:

1. `parseRpgCampaign(payload)` valida `campaign` (objeto), `scenario` ∈ `fantasy|sci-fi|horror|custom`, `characters` e `turns` como arrays. Lança `BadRequestException` em payload inválido.
2. Monta prompt:
   - mestre (`payload.campaign.master === agent`) → `buildMasterPrompt(campaign)`;
   - jogador IA → `buildPlayerPrompt(campaign, agent)` (personagem do agente, atributos, último turno do mestre, roll pendente).
3. `provider.execute('rpg', prompt, [])` gera resposta.
4. **Persiste `Round` antes do TTS** com `context='rpg'`, `game_id = campaign.id`, `scenario`, `scenarioLabel`, `game_status`, `responses=[{agent, content}]`, `winner_agent=null`. Falha de TTS depois disso não apaga o round.
5. Se `response.trim()`:
   - cobra `CREDIT_COSTS.TTS_RESPONSE`;
   - resolve `voiceId` (ver abaixo);
   - `ElevenLabsService.synthesize(response, voiceId?)` → upload S3 `rpg-audio/{userId}/{uuid}.mp3`;
   - grava `History` (assistant) com `audio_url` e `audio_meta` (`{ provider, status, voiceId, model }`);
   - retorna `{ [agent]: { response, audio_url, voice_id? } }`.
6. Em falha do TTS: `creditsService.refund('TTS_RESPONSE')`, **não persiste `History` do assistant** e relança o erro (turno abortado, round permanece sem resposta).

`incrementOnGameAction('rpg', agent)` é chamado independentemente do TTS.

## Vozes por personagem

- **Mestre**: usa voz padrão do ElevenLabs; `voiceId` não é persistido no `character`.
- **Jogador IA**: `resolveRpgCharacterVoiceId(campaign, actor)`:
  - se `character.voiceId` já existe → reusa;
  - senão classifica gênero pelo nome, escolhe via `pickCharacterVoice` evitando IDs em `readUsedRpgVoiceIds(campaign, actor)` (sem duplicar vozes entre personagens);
  - o `voice_id` retornado deve ser persistido no frontend dentro do `character` da campanha — backend não atualiza `campaign.characters`.

## Prompt (regras importantes)

- `buildMasterPrompt`: GM D&D 5e, resposta DIRETA (2-4 frases), nunca atua pelos personagens, encerra com pergunta clara. Inclui marcadores `[HP Nome ±delta]` para variação de HP.
- `buildPlayerPrompt`: 1ª pessoa, mistura diálogo + ação, recebe roll pendente e narração anterior.
- HP delta tags `[HP Nome ±delta]` são parseadas por `parseHpTags` — **só mestre** altera HP. Não introduza no prompt do jogador.

## Status da campanha

`POST /stats/game-status` (`StatsController.updateGameStatus`):

- body: `{ context: 'rpg', gameId, status: 'setup' | 'playing' | 'paused' }`;
- atualiza `game_status` em **todos os rounds** daquela campanha do usuário;
- não exige voto, não cobra crédito;
- chamado pelo frontend em pause/resume — não chame internamente em cada `askGameAction`.

## Stats

- `incrementOnGameAction('rpg', agent)` incrementa `gamesRounds` e `rpgBattles`;
- `computeTotals` agrega `rpgCampaigns` por `game_id` (não por turno) — exige `campaign.id` estável no payload;
- `formatRpgActivity(round)` produz a entrada do feed "Campanha RPG: …" usando `game_status` e `scenarioLabel || scenario`. Mantenha esses campos preenchidos via `extractGameMeta`.

## Custos

- `CREDIT_COSTS.TTS_RESPONSE` é o único custo cobrado pelo turno RPG hoje.
- `CREDIT_COSTS.RPG_TURN` existe mas **não é cobrado** em `askGameAction` — antes de usar, adicione cobrança/refund explicitamente e atualize `ACTION_CAPABILITY`.

## Erros comuns

- Cobrar TTS antes de ter `response.trim()` ou antes de persistir o Round.
- Esquecer o refund quando a síntese ou upload S3 falha.
- Persistir `History` do assistant em falha de TTS (turno "fantasma" sem áudio).
- Atualizar `campaign.characters[].voiceId` no backend — isso é responsabilidade do frontend ao receber `voice_id`.
- Aplicar `parseHpTags` em prompt de jogador.
- Quebrar agrupamento de campanha removendo `game_id` do round.
