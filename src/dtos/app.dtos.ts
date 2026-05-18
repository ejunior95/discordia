import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsString,
  ArrayMinSize,
} from 'class-validator';
import {
  ALLOWED_AGENTS,
  ALLOWED_CONTEXTS,
  AgentName,
  ChatContext,
} from '../shared/global.service';
import type { GameActionContext } from '../utils/gamePromptBuilders';

export class AskAllDto {
  @IsString()
  @IsNotEmpty({ message: 'Pergunta não enviada ou inválida!' })
  question: string;
}

export class AskOneDto extends AskAllDto {
  @IsIn(ALLOWED_AGENTS, {
    message: 'Agente de IA não enviado ou inválido!',
  })
  agent: AgentName;
}

export class HangmanDto {
  @IsString()
  @IsNotEmpty()
  question: string;
}

export class StartSessionDto {
  @IsIn(ALLOWED_CONTEXTS, {
    message: 'Contexto inválido!',
  })
  context: ChatContext;

  @IsArray()
  @ArrayMinSize(1)
  @IsIn(ALLOWED_AGENTS, {
    each: true,
    message: 'Agente de IA não enviado ou inválido!',
  })
  agents: AgentName[];
}

export class GameActionDto {
  @IsIn(ALLOWED_AGENTS, {
    message: 'Agente de IA não enviado ou inválido!',
  })
  agent: AgentName;

  @IsIn(ALLOWED_CONTEXTS.filter((context) => context !== 'chat'), {
    message: 'Contexto de jogo inválido!',
  })
  context: GameActionContext;

  @IsObject({ message: 'Payload da ação de jogo inválido!' })
  payload: Record<string, unknown>;
}

export class VoteRoundDto {
  @IsIn(ALLOWED_AGENTS, {
    message: 'Agente de IA não enviado ou inválido!',
  })
  agent: AgentName;
}
