import OpenAI from 'openai';
import { Injectable, Logger } from '@nestjs/common';
import { getCustomContent } from 'src/utils/getCustomContent';
import { ConfigService } from '@nestjs/config';
import { ChatCompletionMessageParam } from 'openai/resources/chat';

@Injectable()
export class ChatGptService {
  private readonly logger = new Logger(ChatGptService.name);
  private aiInstance: OpenAI;
  private customContent = getCustomContent('chat-gpt');

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      this.logger.error('OPENAI_API_KEY não configurada');
      throw new Error('Configuração da API ChatGPT ausente.');
    }
    this.aiInstance = new OpenAI({ apiKey });
  }

  async execute(question: string, history: { role: 'user' | 'assistant'; content: string }[]) {
    try {
      const messages: ChatCompletionMessageParam[] = [
        { role: 'system', content: this.customContent },
        ...history,
        { role: 'user', content: question },
      ];

      const response = await this.aiInstance.chat.completions.create({
        model: 'gpt-4o',
        messages,
        max_tokens: 100,
        temperature: 0.7,
      });

      const assistantReply = response.choices[0].message.content;
      return { response: assistantReply };
    } catch (error) {
      console.error('Erro na chamada do ChatGPT:', error);
      throw error;
    }
  }
}