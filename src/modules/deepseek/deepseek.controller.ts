import { Body, Controller, HttpException, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { DeepseekService } from './deepseek.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('deepseek')
export class DeepseekController {
  constructor(private readonly deepSeekService: DeepseekService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('/test-message')
  async testMessage(@Body('question') question: string) {
    if (!question || typeof question !== 'string' || question.trim().length === 0 || !/[a-zA-Z]/.test(question)) {
      throw new HttpException('Pergunta não enviada ou inválida!', HttpStatus.BAD_REQUEST);
    }
    try {
      const result = await this.deepSeekService.execute(question);
      return result;
    } catch (error) {
      console.error('❌ Erro no controller ao consultar o Deepseek:', error);
      throw new HttpException('Erro ao consultar o Deepseek.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
