import { IsNotEmpty, IsString } from 'class-validator';

export class AskDto {
  @IsString()
  @IsNotEmpty({ message: 'Pergunta não enviada ou inválida!' })
  question: string;
}
