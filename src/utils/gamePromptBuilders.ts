import { BadRequestException } from '@nestjs/common';
import { AgentName, ChatContext, isAgentName } from '../shared/global.service';

export type GameActionContext = Exclude<ChatContext, 'chat'>;

const IA_LABELS: Record<AgentName, string> = {
  'chat-gpt': 'ChatGPT',
  gemini: 'Gemini',
  deepseek: 'DeepSeek',
  grok: 'Grok',
};

const CHESS_LEVELS = {
  beginner: {
    promptHint:
      'Jogue como um iniciante (~800 de Elo): faça lances razoáveis mas evite cálculos profundos; aceite trocas iguais; cometa pequenos erros táticos ocasionais.',
  },
  casual: {
    promptHint:
      'Jogue como um jogador de clube (~1400 de Elo): desenvolva peças, jogue solidamente, evite blunders, calcule táticas óbvias.',
  },
  hard: {
    promptHint:
      'Jogue de forma agressiva e precisa (~2000+ de Elo): calcule táticas, ataque o rei, busque a melhor jogada possível em cada lance.',
  },
} as const;

type ChessLevel = keyof typeof CHESS_LEVELS;
type ChessSide = 'w' | 'b';
type JokenpoChoice = 'rock' | 'paper' | 'scissors';
type RapRoundIndex = 1 | 2 | 3;
type Scenario = 'fantasy' | 'sci-fi' | 'horror' | 'custom';
type ActorRef = 'user' | AgentName;
type TurnRole = 'master' | 'player';
type TurnStatus = 'loading' | 'success' | 'error';

type DiceType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20' | 'd100';

interface DiceRoll {
  dice: DiceType;
  raw: number;
  modifier: number;
  modifierLabel?: string;
  total: number;
}

interface Attributes {
  for: number;
  des: number;
  con: number;
  int: number;
  sab: number;
  car: number;
}

interface Character {
  owner: ActorRef;
  name: string;
  classe: string;
  hp: number;
  maxHp: number;
  attributes: Attributes;
  voiceId?: string;
}

interface TurnAction {
  id?: string;
  actor: ActorRef;
  role: TurnRole;
  content: string;
  status: TurnStatus;
  error?: string;
  createdAt?: string;
  roll?: DiceRoll;
}

interface RpgCampaignPayload {
  id?: string;
  scenario: Scenario;
  customPrompt?: string;
  master: ActorRef;
  players: ActorRef[];
  turnOrder: ActorRef[];
  currentTurnIndex: number;
  characters: Character[];
  turns: TurnAction[];
  pendingRoll?: DiceRoll;
  status?: string;
  createdAt?: string;
}

interface ScenarioConfig {
  label: string;
  description: string;
  toneLine: string;
}

const SCENARIOS: Record<Scenario, ScenarioConfig> = {
  fantasy: {
    label: 'Fantasia medieval',
    description: 'Reinos, magia, dragões e masmorras profundas.',
    toneLine: 'Tom: épico, vívido, com ar de alta fantasia.',
  },
  'sci-fi': {
    label: 'Ficção científica',
    description: 'Naves, IAs rebeldes, planetas inexplorados.',
    toneLine: 'Tom: tecnológico, com termos de space opera.',
  },
  horror: {
    label: 'Terror',
    description: 'Mistério, sobrenatural e atmosfera opressora.',
    toneLine: 'Tom: sombrio, descritivo, com tensão crescente.',
  },
  custom: {
    label: 'Personalizado',
    description: 'Você define o universo da campanha.',
    toneLine: 'Tom: defina conforme o universo informado.',
  },
};

const TOTAL_RAP_ROUNDS = 3 as const;
const MAX_HISTORY_TURNS = 8;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function requireString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== 'string') {
    throw new BadRequestException(`Campo "${key}" inválido ou ausente.`);
  }
  return value;
}

function optionalString(
  record: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = record[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') {
    throw new BadRequestException(`Campo "${key}" inválido.`);
  }
  return value;
}

function requireStringArray(
  record: Record<string, unknown>,
  key: string,
): string[] {
  const value = record[key];
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new BadRequestException(`Campo "${key}" inválido ou ausente.`);
  }
  return value;
}

function requireRecord(payload: unknown): Record<string, unknown> {
  if (!isRecord(payload)) {
    throw new BadRequestException('Payload inválido ou ausente.');
  }
  return payload;
}

function requireAgent(value: unknown, key: string): AgentName {
  if (!isAgentName(value)) {
    throw new BadRequestException(`Campo "${key}" inválido ou ausente.`);
  }
  return value;
}

function requireNumber(value: unknown, key: string): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new BadRequestException(`Campo "${key}" inválido ou ausente.`);
  }
  return value;
}

function getCategoryLabel(value: string): string {
  const labels: Record<string, string> = {
    animais: 'Animais',
    frutas: 'Frutas',
    paises: 'Países',
    cores: 'Cores',
    'partes-do-corpo': 'Partes do corpo',
    profissoes: 'Profissões',
    'filmes-famosos': 'Filmes famosos',
    'desenhos-animados': 'Desenhos animados',
    esportes: 'Esportes',
    comidas: 'Comidas',
    'objetos-da-casa': 'Objetos da casa',
    'personagens-historicos': 'Personagens históricos',
    'instrumentos-musicais': 'Instrumentos musicais',
    'super-herois': 'Super-heróis',
    'estilos-musicais': 'Estilos musicais',
    'plantas-e-flores': 'Plantas e flores',
    tecnologia: 'Tecnologia',
  };
  return labels[value] ?? value;
}

export function buildIAWordPrompt(
  categoryLabel: string,
  usedWords: string[],
): string {
  const exclusion = usedWords.length
    ? `\nNÃO use nenhuma destas palavras: ${usedWords.join(', ')}.`
    : '';
  return [
    `Você está jogando jogo da forca. Escolha UMA palavra em português da categoria "${categoryLabel}".`,
    'Requisitos:',
    '- Apenas letras de A a Z (sem acentos, sem cedilha, sem espaços, sem hifens).',
    '- Entre 4 e 12 letras.',
    '- Palavra comum, conhecida pela maioria das pessoas.',
    '- Responda APENAS com a palavra em MAIÚSCULAS, sem nenhuma outra palavra, pontuação ou explicação.',
    exclusion,
  ].join('\n');
}

export function buildIAGuessPrompt(input: {
  categoryLabel: string;
  pattern: string;
  wrongLetters: string[];
  triedLetters: string[];
}): string {
  return [
    'Você está jogando jogo da forca e precisa adivinhar a próxima letra.',
    `Categoria: ${input.categoryLabel}.`,
    `Padrão atual (use _ para letras desconhecidas): ${input.pattern}`,
    `Letras já tentadas: ${input.triedLetters.join(', ') || 'nenhuma'}.`,
    `Letras erradas: ${input.wrongLetters.join(', ') || 'nenhuma'}.`,
    'Escolha a letra mais provável que ainda NÃO foi tentada.',
    'Responda APENAS com UMA única letra maiúscula de A a Z, sem mais nada.',
  ].join('\n');
}

export function buildChessMovePrompt(input: {
  fen: string;
  pgn: string;
  side: ChessSide;
  level: ChessLevel;
  lastInvalid?: string;
}): string {
  const sideName = input.side === 'w' ? 'Brancas' : 'Pretas';
  const invalidNote = input.lastInvalid
    ? `\nO seu último lance "${input.lastInvalid}" foi inválido nesta posição. Escolha outro lance legal.`
    : '';

  return [
    `Você é um motor de xadrez controlando as ${sideName}.`,
    CHESS_LEVELS[input.level].promptHint,
    '',
    `FEN atual: ${input.fen}`,
    `Histórico (PGN): ${input.pgn || '(início)'}`,
    '',
    'É a sua vez de jogar.',
    'Responda APENAS com o próximo lance em notação SAN (ex.: e4, Nf3, O-O, exd5, Qxh7+, e8=Q).',
    'Não inclua o número do lance, comentários, asteriscos ou qualquer outro texto. Apenas o lance.',
    invalidNote,
  ].join('\n');
}

function decideJokenpoWinner(
  user: JokenpoChoice,
  ai: JokenpoChoice,
): 'user' | 'ai' | 'draw' {
  if (user === ai) return 'draw';
  if (
    (user === 'rock' && ai === 'scissors') ||
    (user === 'paper' && ai === 'rock') ||
    (user === 'scissors' && ai === 'paper')
  ) {
    return 'user';
  }
  return 'ai';
}

export function buildJokenpoPrompt(
  history: { user: JokenpoChoice; ai: JokenpoChoice }[],
): string {
  const historyLine = history.length
    ? `\nHistórico desta partida (você é a IA):\n${history
        .map((item, index) => {
          const result = decideJokenpoWinner(item.user, item.ai);
          return `  Round ${index + 1}: usuário=${item.user} | você=${item.ai} | ${
            result === 'user'
              ? 'usuário venceu'
              : result === 'ai'
                ? 'você venceu'
                : 'empate'
          }`;
        })
        .join('\n')}`
    : '';

  return [
    'Você está jogando Pedra, Papel e Tesoura contra um usuário humano.',
    'Escolha uma jogada: rock, paper ou scissors.',
    'Tente vencer; varie suas jogadas de forma imprevisível.',
    historyLine,
    'Responda APENAS com uma destas palavras em minúsculas: rock, paper, scissors. Sem mais nada.',
  ].join('\n');
}

export function buildRapPrompt(input: {
  agent: AgentName;
  opponent: AgentName;
  theme: string;
  roundIndex: RapRoundIndex;
  previousOpponentVerse?: string;
  previousOwnVerse?: string;
}): string {
  const agentLabel = IA_LABELS[input.agent];
  const opponentLabel = IA_LABELS[input.opponent];
  const themeLine = input.theme.trim()
    ? `Tema da batalha: "${input.theme.trim()}".`
    : 'Tema livre: ataque o estilo, a precisão e a personalidade do oponente.';

  const history: string[] = [];
  if (input.previousOwnVerse) {
    history.push(`Seu verso anterior:\n"""${input.previousOwnVerse}"""`);
  }
  if (input.previousOpponentVerse) {
    history.push(
      `Último verso do oponente (responda diretamente a ele):\n"""${input.previousOpponentVerse}"""`,
    );
  }

  return [
    `Você é a IA "${agentLabel}" em uma batalha de rap estilo 8 Mile contra a IA "${opponentLabel}".`,
    themeLine,
    `Este é o ROUND ${input.roundIndex} de ${TOTAL_RAP_ROUNDS}.`,
    history.join('\n\n'),
    'Regras:',
    '- Escreva EXATAMENTE 3 estrofes de 8 versos (linhas) em português brasileiro.',
    '- Rimas obrigatórias em pares (AABB ou ABAB).',
    '- Tom provocador, criativo, com punchlines; evite clichês e rimas fáceis.',
    '- Mencione qualidades suas e fraquezas do oponente.',
    '- Não inclua título, numeração, comentários nem explicações. Apenas as 3 estrofes de 8 versos, um por linha.',
  ]
    .filter(Boolean)
    .join('\n\n');
}

function getActorLabel(actor: ActorRef, characters?: Character[]): string {
  if (actor === 'user') {
    const character = characters?.find((item) => item.owner === 'user');
    return character ? character.name : 'Você';
  }
  return IA_LABELS[actor];
}

function formatRoll(roll: DiceRoll): string {
  const mod =
    roll.modifier === 0
      ? ''
      : ` ${roll.modifier > 0 ? '+' : '−'}${Math.abs(roll.modifier)}${
          roll.modifierLabel ? ` (${roll.modifierLabel})` : ''
        }`;
  return `🎲 ${roll.dice}: ${roll.raw}${mod} = ${roll.total}`;
}

function formatHistory(turns: TurnAction[], characters: Character[]): string {
  if (turns.length === 0)
    return '(sem histórico ainda — é o início da campanha)';
  const recent = turns.slice(-MAX_HISTORY_TURNS);
  return recent
    .filter((turn) => turn.status === 'success' && turn.content.trim())
    .map((turn) => {
      const who =
        turn.role === 'master'
          ? 'MESTRE'
          : getActorLabel(turn.actor, characters);
      const rollNote = turn.roll ? ` [${formatRoll(turn.roll)}]` : '';
      return `[${who}]: ${turn.content.trim()}${rollNote}`;
    })
    .join('\n');
}

function formatRoster(characters: Character[]): string {
  return characters
    .map((character) => {
      const ownerLabel =
        character.owner === 'user'
          ? 'Jogador humano'
          : IA_LABELS[character.owner];
      return `- ${character.name} (${character.classe}, HP ${character.hp}/${character.maxHp}) — ${ownerLabel}`;
    })
    .join('\n');
}

export function buildMasterPrompt(campaign: RpgCampaignPayload): string {
  const scenarioCfg = SCENARIOS[campaign.scenario] ?? SCENARIOS.fantasy;
  const customLine =
    campaign.scenario === 'custom' && campaign.customPrompt?.trim()
      ? `Universo definido pelo jogador: """${campaign.customPrompt.trim()}"""`
      : `Cenário: ${scenarioCfg.label} — ${scenarioCfg.description}`;

  return [
    'Você é o MESTRE (Game Master) especialista de uma campanha de RPG de mesa estilo Dungeons & Dragons 5e, em português brasileiro.',
    customLine,
    scenarioCfg.toneLine,
    `Personagens na mesa (todos se conhecem pelo nome):\n${formatRoster(
      campaign.characters,
    )}`,
    `Histórico recente:\n${formatHistory(campaign.turns, campaign.characters)}`,
    'Regras de jogo que você conduz como especialista:',
    '- Use o sistema d20: para ações incertas, peça uma rolagem de d20 + atributo relevante (FOR, DES, CON, INT, SAB ou CAR) contra uma Classe de Dificuldade (CD) que você define (fácil 10, médio 15, difícil 20).',
    '- Em combate, organize por iniciativa, descreva inimigos com objetividade, resolva ataques (rolagem vs CA), aplique dano e atualize o HP dos personagens. Use ataques de oportunidade, vantagem e desvantagem quando fizer sentido.',
    '- Quando dano ou cura acontecer, anote no FINAL da narração marcadores de HP usando o nome EXATO do personagem: [HP Nome -7] para dano ou [HP Nome +4] para cura. Use um marcador para cada personagem afetado e não explique o marcador.',
    '- Quando uma rolagem já foi feita (aparece no histórico como 🎲), narre a CONSEQUÊNCIA do resultado (sucesso, falha ou sucesso parcial) de forma justa.',
    '- Incentive a interação entre os personagens: refira-se a eles pelo nome e crie ganchos para que conversem e ajam em conjunto.',
    'Estilo da narração:',
    '- Seja DIRETO e OBJETIVO. Descreva o ambiente e avance a história em 2 a 4 frases. NUNCA escreva textos longos e contemplativos sobre detalhes irrelevantes.',
    '- NÃO fale nem aja pelos personagens dos jogadores.',
    '- Termine com uma situação, desafio ou pergunta clara que exija ação; se houver incerteza ou combate, peça explicitamente a rolagem necessária (ex.: "Role d20 + DES").',
    '- Responda APENAS com a narração, sem rótulos, sem aspas externas, sem comentários.',
  ].join('\n\n');
}

export function buildPlayerPrompt(
  campaign: RpgCampaignPayload,
  agent: AgentName,
): string {
  const scenarioCfg = SCENARIOS[campaign.scenario] ?? SCENARIOS.fantasy;
  const character = campaign.characters.find((item) => item.owner === agent);
  if (!character)
    throw new BadRequestException(`Personagem não encontrado para ${agent}`);

  const lastMasterTurn = [...campaign.turns]
    .reverse()
    .find((turn) => turn.role === 'master' && turn.status === 'success');

  const customLine =
    campaign.scenario === 'custom' && campaign.customPrompt?.trim()
      ? `Universo: """${campaign.customPrompt.trim()}"""`
      : `Cenário: ${scenarioCfg.label}.`;

  const attrs = character.attributes;
  const attrsLine = `FOR ${attrs.for} · DES ${attrs.des} · CON ${attrs.con} · INT ${attrs.int} · SAB ${attrs.sab} · CAR ${attrs.car}`;

  const rollLine = campaign.pendingRoll
    ? `Sua rolagem para esta ação: ${formatRoll(
        campaign.pendingRoll,
      )}. Interprete esse resultado na sua ação (sucesso alto, falha em valores baixos).`
    : undefined;

  return [
    `Você é "${character.name}", um(a) ${character.classe} em uma campanha de RPG estilo Dungeons & Dragons 5e.`,
    customLine,
    `Seus atributos: ${attrsLine}. HP atual: ${character.hp}/${character.maxHp}.`,
    `Personagens na mesa (você conhece todos pelo nome):\n${formatRoster(
      campaign.characters,
    )}`,
    `Histórico recente:\n${formatHistory(campaign.turns, campaign.characters)}`,
    lastMasterTurn
      ? `O Mestre acabou de narrar:\n"""${lastMasterTurn.content.trim()}"""`
      : 'A aventura está começando.',
    rollLine ?? '',
    'Sua tarefa:',
    `- Responda em primeira pessoa como ${character.name}, em 2 a 4 frases. Seja direto e objetivo.`,
    '- Pode misturar fala ("entre aspas") e descrição de ação. Em combate, declare claramente o que faz (atacar, defender, usar habilidade, fugir).',
    '- Você pode se dirigir a outros personagens da mesa pelo nome, responder a eles e propor ações em conjunto.',
    '- Seja coerente com sua classe, atributos, HP e o histórico.',
    '- Responda APENAS com a fala/ação, sem rótulos como "Personagem:" e sem comentários.',
  ]
    .filter(Boolean)
    .join('\n\n');
}

function parseChessPayload(payload: unknown) {
  const record = requireRecord(payload);
  const level = requireString(record, 'level');
  const side = requireString(record, 'side');
  if (!(level in CHESS_LEVELS))
    throw new BadRequestException('Nível de xadrez inválido.');
  if (side !== 'w' && side !== 'b')
    throw new BadRequestException('Lado de xadrez inválido.');
  return {
    fen: requireString(record, 'fen'),
    pgn: requireString(record, 'pgn'),
    side: side as ChessSide,
    level: level as ChessLevel,
    lastInvalid: optionalString(record, 'lastInvalid'),
  };
}

function parseJokenpoPayload(
  payload: unknown,
): { user: JokenpoChoice; ai: JokenpoChoice }[] {
  const record = requireRecord(payload);
  const history = record.history;
  if (!Array.isArray(history))
    throw new BadRequestException('Histórico de Jokenpo inválido.');
  return history.map((item) => {
    if (!isRecord(item))
      throw new BadRequestException('Round de Jokenpo inválido.');
    const user = requireString(item, 'user');
    const ai = requireString(item, 'ai');
    if (
      !['rock', 'paper', 'scissors'].includes(user) ||
      !['rock', 'paper', 'scissors'].includes(ai)
    ) {
      throw new BadRequestException('Jogada de Jokenpo inválida.');
    }
    return { user: user as JokenpoChoice, ai: ai as JokenpoChoice };
  });
}

function parseRapPayload(payload: unknown, fallbackAgent: AgentName) {
  const record = requireRecord(payload);
  const agent =
    record.agent === undefined
      ? fallbackAgent
      : requireAgent(record.agent, 'agent');
  const opponent = requireAgent(record.opponent, 'opponent');
  const roundIndex = requireNumber(record.roundIndex, 'roundIndex');
  if (![1, 2, 3].includes(roundIndex))
    throw new BadRequestException('Round de rap inválido.');
  return {
    agent,
    opponent,
    theme: requireString(record, 'theme'),
    roundIndex: roundIndex as RapRoundIndex,
    previousOpponentVerse: optionalString(record, 'previousOpponentVerse'),
    previousOwnVerse: optionalString(record, 'previousOwnVerse'),
  };
}

function parseRpgCampaign(payload: unknown): RpgCampaignPayload {
  const record = requireRecord(payload);
  const campaign = record.campaign;
  if (!isRecord(campaign))
    throw new BadRequestException('Campanha de RPG inválida.');
  const scenario = requireString(campaign, 'scenario');
  if (!['fantasy', 'sci-fi', 'horror', 'custom'].includes(scenario)) {
    throw new BadRequestException('Cenário de RPG inválido.');
  }
  if (!Array.isArray(campaign.characters) || !Array.isArray(campaign.turns)) {
    throw new BadRequestException('Estado de RPG inválido.');
  }
  return campaign as unknown as RpgCampaignPayload;
}

export function buildGameActionPrompt(
  context: GameActionContext,
  agent: AgentName,
  payload: unknown,
): string {
  const record = requireRecord(payload);

  switch (context) {
    case 'hangman-chooser': {
      const categoryLabel = getCategoryLabel(requireString(record, 'category'));
      const usedWords = requireStringArray(record, 'usedWords');
      return buildIAWordPrompt(categoryLabel, usedWords);
    }
    case 'hangman-guesser': {
      const categoryLabel = getCategoryLabel(requireString(record, 'category'));
      return buildIAGuessPrompt({
        categoryLabel,
        pattern: requireString(record, 'pattern'),
        wrongLetters: requireStringArray(record, 'wrongLetters'),
        triedLetters: requireStringArray(record, 'triedLetters'),
      });
    }
    case 'chess':
      return buildChessMovePrompt(parseChessPayload(payload));
    case 'jokenpo':
      return buildJokenpoPrompt(parseJokenpoPayload(payload));
    case 'rap-battle':
      return buildRapPrompt(parseRapPayload(payload, agent));
    case 'rpg': {
      const campaign = parseRpgCampaign(payload);
      return campaign.master === agent
        ? buildMasterPrompt(campaign)
        : buildPlayerPrompt(campaign, agent);
    }
    default:
      throw new BadRequestException(
        `Contexto de jogo "${context}" não suportado.`,
      );
  }
}

export function summarizeGameAction(
  context: GameActionContext,
  payload: unknown,
): string {
  if (!isRecord(payload)) return `[${context}] ação de jogo`;
  switch (context) {
    case 'hangman-chooser':
      return `[forca] escolher palavra: categoria=${String(payload.category ?? '')}`;
    case 'hangman-guesser':
      return `[forca] sugerir letra: padrão=${String(payload.pattern ?? '')}`;
    case 'chess':
      return `[xadrez] lance IA: fen=${String(payload.fen ?? '')}`;
    case 'jokenpo':
      return '[jokenpo] escolher jogada';
    case 'rap-battle':
      return `[rap-battle] gerar verso: round=${String(payload.roundIndex ?? '')}`;
    case 'rpg':
      return '[rpg] gerar turno';
    default:
      return `[${context}] ação de jogo`;
  }
}
