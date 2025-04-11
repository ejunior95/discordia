import { ChatGptService } from './chat-gpt/chat-gpt.service';
import { DeepseekService } from './deepseek/deepseek.service';
import { Injectable } from '@nestjs/common';
import { GeminiService } from './gemini/gemini.service';

@Injectable()
export class AppService {
  constructor(
    private readonly chatGptService: ChatGptService,
    private readonly deepseekService: DeepseekService,
    private readonly geminiService: GeminiService
  ) {}
  getHello(): string {
    return 'Hello World!';
  }
}
