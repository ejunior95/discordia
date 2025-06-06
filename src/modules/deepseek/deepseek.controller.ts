import { Controller, HttpException, HttpStatus, Post, Req, Res, UseGuards } from '@nestjs/common';
import { DeepseekService } from './deepseek.service';
import { AuthGuard } from '@nestjs/passport';
import { UserResponseDto } from '../users/dtos/response-user.dto';
import { Request, Response } from 'express';

@Controller('deepseek')
export class DeepseekController {
  constructor(private readonly deepSeekService: DeepseekService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('/test-message')
  async testMessage(@Req() req: Request & { user: UserResponseDto }, @Res() res: Response) {
    try {
      const { question } = req.body;
      const userId = req.user.id;
    
      if (!question || !isNaN(question)) {
        return res.status(HttpStatus.BAD_REQUEST).json({
            message: 'Pergunta não enviada ou inválida!'
        });    
      }
      const history = await this.deepSeekService.getRecentHistory(userId, 10);
      const result = await this.deepSeekService.execute('chat', question, history);
      await this.deepSeekService.addHistory('chat', userId, 'user', question);
      await this.deepSeekService.addHistory(
          'chat',
          userId, 
          'assistant', 
          result.response ? result.response : '', 
          'deepseek'
      );
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      console.error('❌ Erro no controller ao consultar o Deepseek:', error);
      throw new HttpException('Erro ao consultar o Deepseek.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
