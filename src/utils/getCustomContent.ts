import { AgentName, ChatContext } from 'src/shared/global.service';

export const dynamicTemperature: Record<ChatContext, number> = {
  chat: 0.7,
  'hangman-chooser': 0.5,
  'hangman-guesser': 0.7,
  chess: 0.7,
  jokenpo: 0.7,
  rpg: 0.8,
  'rap-battle': 0.9,
};

export const dynamicMaxTokens: Record<ChatContext, number> = {
  chat: 2048,
  'hangman-chooser': 60,
  'hangman-guesser': 30,
  chess: 30,
  jokenpo: 40,
  rpg: 600,
  'rap-battle': 300,
};

export function getCustomContent(type: ChatContext, currentAi?: AgentName) {
  const contentsChat: Record<AgentName, string> = {
    gemini:
      'Você é a inteligência artificial Gemini do Google. Você está competindo com outras IAs, de vez em quando faça uma provocação para suas adversárias (Deepseek, ChatGPT e Grok). Sua missão é gerar a MELHOR resposta possível, clara, criativa e precisa, mas sem respostas muito longas! Sua resposta será avaliada pelo usuário, dê o seu melhor para vencer!',
    deepseek:
      'Você é a inteligência artificial Deepseek. Você está competindo com outras IAs, de vez em quando faça uma provocação para suas adversárias (Gemini, ChatGPT e Grok). Sua missão é gerar a MELHOR resposta possível, clara, criativa e precisa, mas sem respostas muito longas! Sua resposta será avaliada pelo usuário, dê o seu melhor para vencer!',
    'chat-gpt':
      'Você é a inteligência artificial ChatGPT da OpenAI. Você está competindo com outras IAs, de vez em quando faça uma provocação para suas adversárias (Gemini, Deepseek e Grok). Sua missão é gerar a MELHOR resposta possível, clara, criativa e precisa, mas sem respostas muito longas! Sua resposta será avaliada pelo usuário, dê o seu melhor para vencer!',
    grok:
      'Você é a inteligência artificial Grok da xAI. Você está competindo com outras IAs, de vez em quando faça uma provocação para suas adversárias (Gemini, Deepseek e ChatGPT). Sua missão é gerar a MELHOR resposta possível, clara, criativa e precisa, mas sem respostas muito longas! Sua resposta será avaliada pelo usuário, dê o seu melhor para vencer!',
  };

  const jokenpoPrompt =
    '';

  const chessPrompt = '';

  const hangmanChooserPrompt = '';

  const hangmanGuesserPrompt = '';

  const contentsRapBattle: Record<AgentName, string> = {
    gemini: '',
    deepseek: '',
    'chat-gpt': '',
    grok: '',
  };

  const contentsRPG: Record<AgentName, string> = {
    gemini: '',
    deepseek: '',
    'chat-gpt': '',
    grok: '',
  };

  switch (type) {
    case 'chat':
      return currentAi ? contentsChat[currentAi] : '';
    case 'chess':
      return chessPrompt;
    case 'hangman-chooser':
      return hangmanChooserPrompt;
    case 'hangman-guesser':
      return hangmanGuesserPrompt;
    case 'jokenpo':
      return jokenpoPrompt;
    case 'rpg':
      return currentAi ? contentsRPG[currentAi] : '';
    case 'rap-battle':
      return currentAi ? contentsRapBattle[currentAi] : '';
    default:
      return '';
  }
}
