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
      return {
        'chat-gpt': await this.chatGptService.execute(question),
        'gemini': await this.geminiService.execute(question),
        'deepseek': await this.deepseekService.execute(question),
      }
    } catch (error) {
      console.error('Erro no retorno em um ou mais dos agentes: ', error);
      return error;
    };
  };

  async askToOne(question: string, agent: string) {
    try {
      const response = {};
      if (agent === 'deepseek') {
        response[agent] = await this.deepseekService.execute(question);
      }
      if (agent === 'gemini') {
        response[agent] = await this.geminiService.execute(question);
      }
      if (agent === 'chat-gpt') {
        response[agent] = await this.chatGptService.execute(question);
      }
      return response;
    } catch (error) {
      console.error(error);
      return error;
    };
  };
}
