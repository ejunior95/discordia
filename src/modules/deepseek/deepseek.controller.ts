import { Controller, HttpStatus, Post, Req, Res, UseGuards } from '@nestjs/common';
import { DeepseekService } from './deepseek.service';
import { Request, Response } from 'express';
import { AuthGuard } from '@nestjs/passport';

@Controller('deepseek')
export class DeepseekController {
    constructor(
        private readonly deepSeekService: DeepseekService,
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
            const response  = await this.deepSeekService.execute(question);
            return res.status(HttpStatus.OK).json({ response });
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(error);
        }
    }
}
