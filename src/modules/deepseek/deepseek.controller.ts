import {
  Body,
  Controller,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { DeepseekService } from './deepseek.service';
import { AuthGuard } from '@nestjs/passport';
import { UserResponseDto } from '../users/dtos/response-user.dto';
import { Request, Response } from 'express';
import { HistoryService } from 'src/shared/history.service';
import { AskDto } from 'src/dtos/ask.dto';

@Controller('deepseek')
export class DeepseekController {
  constructor(
    private readonly deepseekService: DeepseekService,
    private readonly historyService: HistoryService,
  ) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('/test-message')
  async testMessage(
    @Body() body: AskDto,
    @Req() req: Request & { user: UserResponseDto },
    @Res() res: Response,
  ) {
    try {
      const userId = req.user.id;
      const history = await this.historyService.getRecent(userId, 10, 'chat');
      const result = await this.deepseekService.execute(
        'chat',
        body.question,
        history,
      );

      await this.historyService.add('chat', userId, 'user', body.question);
      await this.historyService.add(
        'chat',
        userId,
        'assistant',
        result.response,
        'deepseek',
      );

      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: (error as Error).message });
    }
  }
}
