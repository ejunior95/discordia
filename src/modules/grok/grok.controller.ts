import { Controller, HttpStatus, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { GrokService } from './grok.service';
import { AuthGuard } from '@nestjs/passport';


@Controller('grok')
export class GrokController {
    constructor(
        private readonly grokService: GrokService,
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
            const result = await this.grokService.execute(question);
            return res.status(HttpStatus.OK).json(result);
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(error);
        }
    }
}
