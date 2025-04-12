import { Controller, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { AppService } from './app.service';
import { Request, Response } from 'express';

const ALLOWED_AGENTS = ['deepseek', 'gemini', 'chat-gpt'];

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('/ask-to-all')
    async askToAllAgents(@Req() req: Request, @Res() res: Response) {
        try {
            const { question } = req.body;
            if (!question || !isNaN(question)) {
                return res.status(HttpStatus.BAD_REQUEST).json({
                    message: 'Pergunta não enviada ou inválida!',
                });    
            };
            const result = await this.appService.askToAll(question);
            return res.status(HttpStatus.OK).json(result);
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(error);
        };
    };

  @Post('/ask-to-one')
    async askToOnlyOneAgent(@Req() req: Request, @Res() res: Response) {
        try {
            const { question, agent } = req.body;
            if (!question || !isNaN(question)) {
                return res.status(HttpStatus.BAD_REQUEST).json({
                    message: 'Pergunta não enviada ou inválida!',
                });    
            };
            if (!agent || !isNaN(agent) || !ALLOWED_AGENTS.includes(agent)) {
                return res.status(HttpStatus.BAD_REQUEST).json({
                    message: 'Agente de IA não enviado ou inválido!',
                    supported_agents: ALLOWED_AGENTS,
                });    
            };
            const result = await this.appService.askToOne(question, agent);
            return res.status(HttpStatus.OK).json(result);
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(error);
        };
    };
}
