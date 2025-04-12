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

  async askToAll(question: string) {
    try {
      return 'Hello World!';
    } catch (error) {
      console.error('Erro no retorno dos agentes: ', error);
      return error;
    };
  };

  async askToOne(question: string, agent: string) {
    try {
      return 'Hello World!';
    } catch (error) {
      console.error(error);
      return error;
    };
  };

  formatResponse() {
  
  };
}
