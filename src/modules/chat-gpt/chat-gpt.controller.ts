import { Controller, HttpStatus, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ChatGptService } from './chat-gpt.service';
import { Request, Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { AppService } from 'src/app.service';
import { UserResponseDto } from '../users/dtos/response-user.dto';

@Controller('chat-gpt')
export class ChatGptController {
    constructor(private readonly chatGptService: ChatGptService) {}

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

            const history = await this.chatGptService.getRecentHistory(userId, 10);
            const result = await this.chatGptService.execute('chat', question, history);
            await this.chatGptService.addHistory('chat', userId, 'user', question);
            await this.chatGptService.addHistory(
                'chat',
                userId, 
                'assistant', 
                result.response ? result.response : '', 
                'chat-gpt'
            );

            return res.status(HttpStatus.OK).json(result);
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(error);
        }
    }
}
