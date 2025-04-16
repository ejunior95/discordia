import { Controller, Get, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { GrokService } from './grok.service';

@Controller('grok')
export class GrokController {
    constructor(
        private readonly grokService: GrokService,
    ) {}

    @Post('/test-message')
    async testMessage(@Req() req: Request, @Res() res: Response) {
        try {
            const { question } = req.body;
            if (!question || !isNaN(question)) {
                return res.status(HttpStatus.BAD_REQUEST).json({
                    message: 'Pergunta não enviada ou inválida!'
                });    
            }
            const result = await this.grokService.execute(question);
            return res.status(HttpStatus.OK).json({
                response: result.text
            });
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(error);
        }
    }
}
