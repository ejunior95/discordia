import { Controller, HttpStatus, Post, Req, Res, UseGuards } from '@nestjs/common';
import { GeminiService } from './gemini.service';
import { Request, Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { UserResponseDto } from '../users/dtos/response-user.dto';

@Controller('gemini')
export class GeminiController {
    constructor(private readonly geminiService: GeminiService) {}

    @UseGuards(AuthGuard('jwt'))
    @Post('/test-message')
    async testMessage(@Req() req: Request & { user: UserResponseDto }, @Res() res: Response) {
        try {
            const { question } = req.body;
            const userId = req.user.id
            if (!question || !isNaN(question)) {
                return res.status(HttpStatus.BAD_REQUEST).json({
                    message: 'Pergunta não enviada ou inválida!'
                });    
            }

            const history = await this.geminiService.getRecentHistory(userId, 10);
            const result = await this.geminiService.execute('chat', question, history);
            await this.geminiService.addHistory('chat', userId, 'user', question);
            await this.geminiService.addHistory(
                'chat',
                userId, 
                'assistant', 
                result.response ? result.response : '', 
                'gemini'
            );

            return res.status(HttpStatus.OK).json(result);
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(error);
        }
    }
}
