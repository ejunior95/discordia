import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ALLOWED_AGENTS, AgentName } from 'src/shared/global.service';

export class CreateAgentDto {
  @IsString()
  @IsNotEmpty()
  @IsIn([...ALLOWED_AGENTS])
  name: AgentName;

  @IsString()
  @IsNotEmpty()
  label: string;

  @IsString()
  @IsNotEmpty()
  model: string;
}

export class UpdateAgentDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  label?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  model?: string;
}
