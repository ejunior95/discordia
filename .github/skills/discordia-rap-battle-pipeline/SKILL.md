---
name: discordia-rap-battle-pipeline
description: "Use when implementar, depurar ou auditar o pipeline completo da batalha de rima: verso da IA, cobrança MUSIC_GEN, submissão Sunor, polling pollAndFinalize, refund e persistência local."
---

# discordIA Rap Battle Pipeline

Pipeline ponta-a-ponta de um verso de rap battle no discordIA, do clique no frontend ao áudio final.

## Quando usar

- Adicionar novo estado de UI no fluxo de música.
- Investigar verso sem áudio, cobrança duplicada/perdida, ou polling preso.
- Trocar provedor de música ou política de retry/refund.

## Diagrama

```
Frontend useRapBattle
  │  askGameAction('rap-battle', agent, payload{battleId, theme, roundIndex, ...})
  ▼
Backend AppService.askGameAction
  ├─ buildGameActionPrompt → provider.execute → verse
  ├─ History.add(user summary) + History.add(assistant, verse)
  ├─ Round.save({context:'rap-battle', game_id:battleId, theme, responses:[{agent, verse}]})
  ├─ statsService.incrementOnGameAction('rap-battle', agent)
  ├─ creditsService.charge(MUSIC_GEN)
  └─ musicGenerationService.createRapVerseTask(verse, theme, userId)
        ├─ OK  → { musicTaskId, musicStatus:'pending' }
        └─ ERR → refund MUSIC_GEN → { musicStatus:'failed', musicError }
  ▼
Frontend
  ├─ Persiste verso em RAP_BATTLE_STORAGE_KEY
  ├─ Se musicTaskId: startMusicPolling → pollRapMusic(taskId)
  └─ Voto via voteOnRound(roundId, agent)
  ▼
Backend GET /music/rap-verse/:taskId/status
  └─ pollAndFinalize: Sunor → atualiza History.audio_url/audio_meta → status pending|ready|failed
```

## Pontos de falha e tratamento

| Ponto | Falha possível | Tratamento esperado |
|-------|----------------|---------------------|
| `provider.execute` | timeout/erro IA | Erro propagado, sem Round persistido, sem cobrança |
| `creditsService.charge` | saldo insuficiente | 402 INSUFFICIENT_CREDITS; verso não é gerado |
| `createRapVerseTask` (pré-Sunor) | rede/validação | Refund MUSIC_GEN; resposta com `musicStatus:'failed'` |
| Sunor após submissão | erro assíncrono | Sem refund; `pollAndFinalize` retorna `failed` |
| Polling | timeout/abort | Frontend para o polling; música pode terminar depois (ler novamente) |

Cobrança nunca acontece antes do verso existir; refund nunca acontece depois da Sunor aceitar a tarefa.

## Contratos

Resposta de `askGameAction` para `rap-battle`:

```ts
{
  [agent]: {
    response: string;            // verso
    audio: {
      musicTaskId?: string;
      musicStatus: 'pending' | 'ready' | 'failed';
      musicError?: string;
      creditsCharged?: number;
    };
  };
  roundId: string;
}
```

Resposta de `GET /music/rap-verse/:taskId/status`:

```ts
{
  status: 'pending' | 'ready' | 'failed';
  audio_url?: string;
  audio_meta?: Record<string, unknown>;
  error?: string;
}
```

## Procedimento ao alterar o pipeline

1. Editar `AppService.askGameAction` (bloco `if (context === 'rap-battle')`) e `MusicGenerationService`.
2. Sincronizar `useRapBattle` (frontend) com novos campos de `audio`.
3. Atualizar `audio.service.ts` se a forma do polling mudar.
4. Garantir que stats sigam por `game_id` (não por verso) — ver skill `discordia-vote-flow`.
5. Lint + testes do backend (`gamePromptBuilders.spec.ts` cobre tokens mínimos do contexto).
6. Validar persistência local: limpar `localStorage['discordia-rap-battle']` e refazer um round.

## Erros comuns

- Cobrar MUSIC_GEN antes do verso (ordem invertida no `askGameAction`).
- Falha na submissão Sunor sem refund → usuário paga por nada.
- Frontend reiniciando polling para `musicTaskId` que já é `ready` (gerar throttle/checar status antes).
- Misturar polling de RPG TTS (síncrono, ElevenLabs) com pipeline de rap (assíncrono, Sunor).
- Tentar votar antes de salvar `roundId` retornado pelo backend.
