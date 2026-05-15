import { IsArray, IsIn, IsNotEmpty, IsString, ArrayMinSize } from 'class-validator';
import { ALLOWED_AGENTS, ALLOWED_CONTEXTS, AgentName, ChatContext } from '../shared/global.service';

export class AskAllDto {
  @IsString()
  @IsNotEmpty({ message: 'Pergunta não enviada ou inválida!' })
  question: string;
}

export class AskOneDto extends AskAllDto {
  @IsIn(ALLOWED_AGENTS as unknown as string[], {
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
  @IsIn(ALLOWED_CONTEXTS as unknown as string[], { message: 'Contexto inválido!' })
  context: ChatContext;

  @IsArray()
  @ArrayMinSize(1)
  @IsIn(ALLOWED_AGENTS as unknown as string[], {
    each: true,
    message: 'Agente de IA não enviado ou inválido!',
  })
  agents: AgentName[];
}
