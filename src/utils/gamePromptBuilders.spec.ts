import { BadRequestException } from '@nestjs/common';
import {
  buildGameActionPrompt,
  buildIAWordPrompt,
  buildJokenpoPrompt,
} from './gamePromptBuilders';

describe('gamePromptBuilders', () => {
  it('builds the hangman word prompt with frontend rules', () => {
    const prompt = buildIAWordPrompt('Animais', ['GATO']);

    expect(prompt).toContain('Escolha UMA palavra em português da categoria "Animais"');
    expect(prompt).toContain('Apenas letras de A a Z');
    expect(prompt).toContain('NÃO use nenhuma destas palavras: GATO.');
    expect(prompt).toContain('Responda APENAS com a palavra em MAIÚSCULAS');
  });

  it('builds jokenpo prompt with round history', () => {
    const prompt = buildJokenpoPrompt([{ user: 'rock', ai: 'scissors' }]);

    expect(prompt).toContain('Você está jogando Pedra, Papel e Tesoura');
    expect(prompt).toContain('Round 1: usuário=rock | você=scissors | usuário venceu');
    expect(prompt).toContain('rock, paper, scissors');
  });

  it('builds chess prompt from structured payload', () => {
    const prompt = buildGameActionPrompt('chess', 'gemini', {
      fen: 'startpos',
      pgn: '',
      side: 'b',
      level: 'casual',
      lastInvalid: 'banana',
    });

    expect(prompt).toContain('Você é um motor de xadrez controlando as Pretas.');
    expect(prompt).toContain('Jogue como um jogador de clube');
    expect(prompt).toContain('FEN atual: startpos');
    expect(prompt).toContain('O seu último lance "banana" foi inválido nesta posição.');
  });

  it('rejects invalid game payloads', () => {
    expect(() =>
      buildGameActionPrompt('jokenpo', 'grok', {
        history: [{ user: 'rock', ai: 'lizard' }],
      }),
    ).toThrow(BadRequestException);
  });
});
