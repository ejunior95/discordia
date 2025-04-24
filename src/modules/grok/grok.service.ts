import Anthropic from '@anthropic-ai/sdk';
import { Injectable } from '@nestjs/common';
import { getCustomContent } from 'src/utils/getCustomContent';

@Injectable()
export class GrokService {
  private aiInstance = new Anthropic({
    apiKey: process.env.GROK_API_KEY,
    baseURL: process.env.GROK_API_BASE_URL
  });
  customContent: string = getCustomContent('grok');

  async execute(question: string) {
    try {
      const response = await this.aiInstance.messages.create({
        model: 'grok-3-beta',
        max_tokens: 250,
        messages: [
          {
            role: 'assistant',
            content: this.customContent
          },
          {
            role: 'user',
            content: question
          },
        ],
        temperature: 0.7
      });
      return response.content[0];
    } catch (error) {
      console.error('Erro na chamada do Grok:', error);
      return error;
    };
  };
}