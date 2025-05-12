import { Controller, HttpStatus, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { GrokService } from './grok.service';
import { AuthGuard } from '@nestjs/passport';
import { UserResponseDto } from '../users/dtos/response-user.dto';


@Controller('grok')
export class GrokController {
    constructor(private readonly grokService: GrokService) {}

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

            const history = await this.grokService.getRecentHistory(userId, 10);
            const result = await this.grokService.execute('chat', question, history);
            await this.grokService.addHistory('chat',userId, 'user', question);
            await this.grokService.addHistory(
                'chat',
                userId, 
                'assistant', 
                result.response ? result.response : '', 
                'grok'
            );

            return res.status(HttpStatus.OK).json(result);
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(error);
        }
    }
}
