import { Controller, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { ChatGptService } from './chat-gpt.service';
import { Request, Response } from 'express';

@Controller('chat-gpt')
export class ChatGptController {
    constructor(
        private readonly chatGptService: ChatGptService,
    ) {}

    @Post('/test-message')
    async testMessage(@Req() req: Request, @Res() res: Response) {
        try {
            const result = await this.chatGptService.execute();
            return res.status(HttpStatus.OK).json(result);
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(error);
        }
    }
}
