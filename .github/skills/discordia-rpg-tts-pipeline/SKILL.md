---
name: discordia-rpg-tts-pipeline
description: "Use when implementar, depurar ou auditar o pipeline de RPG do discordIA: turno de IA com TTS ElevenLabs (mestre/jogador), cobrança/refund TTS_RESPONSE, resolução de voz por personagem, persistência de campanha e sincronização de game_status."
---

# discordIA RPG TTS Pipeline

Pipeline ponta-a-ponta de um turno de RPG narrado por IA, do `useRpgCampaign` no frontend até o `audio_url` reproduzido na mesa.

## Quando usar

- Adicionar etapa nova ao turno de IA (efeitos, validações, novos atributos).
- Investigar áudio ausente, cobrança duplicada/perdida, voz trocando entre turnos do mesmo personagem.
- Trocar provedor de TTS ou política de refund.
- Auditar consistência entre `game_status`, rounds da campanha e stats.

## Diagrama

```
Frontend useRpgCampaign.generateAITurn(actor)
  │  AbortController.abort() do turno anterior
  │  (jogador IA) rola d20 + modificador
  │  askGameAction('rpg', actor, { campaign }, signal)
  ▼
Backend AppService.askGameAction (context='rpg')
  ├─ parseRpgCampaign(payload)
  ├─ buildMasterPrompt(campaign)  OR  buildPlayerPrompt(campaign, actor)
  ├─ provider.execute('rpg', prompt, [])   → response
  ├─ History.add('rpg', userId, 'user', summary)
  ├─ Round.save({context:'rpg', game_id:campaign.id, scenario, scenarioLabel, game_status, responses:[{actor, content}]})
  ├─ statsService.incrementOnGameAction('rpg', actor)
  └─ if response.trim():
      ├─ creditsService.charge(TTS_RESPONSE)
      ├─ voiceId = master ? default : resolveRpgCharacterVoiceId(campaign, actor)
      ├─ elevenLabs.synthesize(response, voiceId?)
      ├─ s3.upload('rpg-audio/{userId}/{uuid}.mp3')
      ├─ History.add('rpg', userId, 'assistant', response, agent, { audio_url, audio_meta })
      └─ return { roundId, [actor]: { response, audio_url, voice_id? } }
      └─ on error → creditsService.refund(TTS_RESPONSE) + throw (NO assistant history)
  ▼
Frontend
  ├─ Atualiza turn com { content, audioUrl, voiceId, hpDeltas? }
  ├─ Persiste voice_id em character.voiceId (jogador IA, primeira vez)
  ├─ (mestre) parseHpTags(content, characters) → applyHpDeltas
  ├─ TurnBubble renderiza <AudioPlayer> só se audioUrl existir
  └─ pause()/resume() → syncGameStatus('rpg', campaign.id, status) → POST /stats/game-status
```

## Pontos de falha e tratamento

| Ponto | Falha | Tratamento esperado |
|-------|-------|---------------------|
| `parseRpgCampaign` | payload inválido | 400 `BadRequestException`, sem cobrança |
| `provider.execute` | erro IA | propaga; Round não persistido; sem cobrança TTS |
| Round save | erro Mongo | propaga; sem cobrança TTS |
| `creditsService.charge` | saldo insuficiente | 402 `INSUFFICIENT_CREDITS`; turno aborta sem áudio |
| `elevenLabs.synthesize` | erro provedor | refund TTS_RESPONSE; 500; **sem** History do assistant |
| `s3.upload` | erro upload | refund TTS_RESPONSE; 500; **sem** History do assistant |
| Frontend abort | usuário pausa/reseta | turno → status='error'; campanha persiste |

Cobrança nunca acontece antes de ter `response.trim()`. Refund nunca acontece se o áudio chegou ao S3 e o History foi persistido.

## Vozes por personagem

| Ator | voiceId | Persistência |
|------|---------|--------------|
| Mestre IA | default ElevenLabs | não persiste em character |
| Jogador IA (1ª vez) | gerado por `resolveRpgCharacterVoiceId` (evita IDs em `readUsedRpgVoiceIds`) | frontend grava em `character.voiceId` |
| Jogador IA (próximas) | reusa `character.voiceId` | já está em storage |

Trocar a voz de um personagem ao longo da campanha quebra imersão. Em refactor, garanta que o frontend **continue** persistindo `voice_id` retornado.

## HP deltas

- Mestre inclui tags `[HP Nome ±delta]` no fim da narração.
- Backend `parseHpTags` é usado dentro do builder; frontend re-parseia em `rpg.constants.ts` para aplicar `applyHpDeltas` no estado.
- Não introduza tags em prompt de jogador — só mestre move HP.

## Game status

`POST /stats/game-status` (`StatsService.updateGameStatus`):

- atualiza `game_status` em todos os rounds da campanha do usuário;
- valores: `setup`, `playing`, `paused`;
- chamado por `useRpgCampaign.pause/resume` — não chame em cada turno;
- não cobra crédito, não exige voto.

## Voto em RPG

Não há UI específica de voto em RPG. O endpoint genérico `POST /rounds/:id/vote` aceita o `roundId` retornado por `askGameAction` e gera `wins` para o agente — útil se um dia houver "voto no melhor turno". Stats já contam isso como `gameVotes` pelo `context='rpg'`.

## Procedimento ao alterar o pipeline

1. Editar branch `if (context === 'rpg')` em `AppService.askGameAction`.
2. Atualizar `parseRpgCampaign`/`buildMasterPrompt`/`buildPlayerPrompt`/`extractGameMeta` em `gamePromptBuilders.ts`.
3. Se a forma da resposta mudar (`audio_url`, `voice_id`, novos campos), atualizar:
   - `useRpgCampaign.generateAITurn` (extração + persistência);
   - `TurnAction` / `RpgCampaign` em `features/rpg/types.ts`;
   - componentes consumidores (`TurnBubble`, `AudioPlayer`, `RpgTable`).
4. Se mudar fluxo de cobrança/refund, sincronizar `CREDIT_COSTS` e `ACTION_CAPABILITY`.
5. Rodar `pnpm run lint` + `pnpm run test` no backend. Validar `gamePromptBuilders.spec.ts`.
6. Limpar `localStorage['discordia-rpg-campaign']` ao testar para evitar shape antigo.

## Erros comuns

- Persistir History do assistant quando o TTS falhou.
- Cobrar TTS sem `response.trim()` (resposta vazia da IA).
- Esquecer refund em qualquer caminho de erro após `charge`.
- Frontend não persistir `voice_id` → voz nova a cada turno do mesmo personagem.
- Renderizar `<AudioPlayer>` com URL undefined.
- Tratar pause/resume como evento por turno (deve ser só transição de estado).
- Confundir `RPG_TURN` (definido, não cobrado) com `TTS_RESPONSE` (cobrado).
