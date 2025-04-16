import { Injectable } from '@nestjs/common';
import { ChatGptService } from './modules/chat-gpt/chat-gpt.service';
import { DeepseekService } from './modules/deepseek/deepseek.service';
import { GeminiService } from './modules/gemini/gemini.service';
import { GrokService } from './modules/grok/grok.service';

@Injectable()
export class AppService {
  constructor(
    private readonly chatGptService: ChatGptService,
    private readonly deepseekService: DeepseekService,
    private readonly geminiService: GeminiService,
    private readonly grokService: GrokService,
  ) {}

  async askToAll(question: string) {
    try {
      const grokResponse = await this.grokService.execute(question);
      return {
        'chat-gpt': {
          response: await this.chatGptService.execute(question)
        },
        'gemini':  await this.geminiService.execute(question),
        'deepseek': {
          response: await this.deepseekService.execute(question)
        },
        'grok': {
          response: grokResponse.text
        },
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
        response[agent] = {
          response: await this.deepseekService.execute(question)
        };
      };
      if (agent === 'gemini') {
        response[agent] = await this.geminiService.execute(question)
      };
      if (agent === 'chat-gpt') {
        response[agent] = {
          response: await this.chatGptService.execute(question)
        };
      };
      if (agent === 'grok') {
        const grokResponse = await this.grokService.execute(question);
        response[agent] = {
          response: grokResponse.text
        };
      };
      return response;
    } catch (error) {
      console.error(error);
      return error;
    };
  };
}
