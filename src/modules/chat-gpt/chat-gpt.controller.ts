import { Controller, HttpStatus, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ChatGptService } from './chat-gpt.service';
import { Request, Response } from 'express';
import { AuthGuard } from '@nestjs/passport';

@Controller('chat-gpt')
export class ChatGptController {
    constructor(
        private readonly chatGptService: ChatGptService,
    ) {}

    @UseGuards(AuthGuard('jwt'))
    @Post('/test-message')
    async testMessage(@Req() req: Request, @Res() res: Response) {
        try {
            const { question } = req.body;
            if (!question || !isNaN(question)) {
                return res.status(HttpStatus.BAD_REQUEST).json({
                    message: 'Pergunta não enviada ou inválida!'
                });    
            }
            const result = await this.chatGptService.execute(question);
            return res.status(HttpStatus.OK).json(result);
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(error);
        }
    }
}
