import { Controller, Get, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { GeminiService } from './gemini.service';
import { Request, Response } from 'express';

@Controller('gemini')
export class GeminiController {
    constructor(
        private readonly geminiService: GeminiService,
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
            const result = await this.geminiService.execute(question);
            return res.status(HttpStatus.OK).json(result);
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(error);
        }
    }
}
