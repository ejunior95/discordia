import OpenAI from 'openai';
import { Injectable, Logger } from '@nestjs/common';
import {
  dynamicMaxTokens,
  dynamicTemperature,
  getCustomContent,
} from 'src/utils/getCustomContent';
import { ConfigService } from '@nestjs/config';
import { ChatCompletionMessageParam } from 'openai/resources/chat';
import { ChatContext } from 'src/shared/global.service';

@Injectable()
export class ChatGptService {
  private readonly logger = new Logger(ChatGptService.name);
  private readonly aiInstance: OpenAI;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      this.logger.error('OPENAI_API_KEY não configurada');
      throw new Error('Configuração da API ChatGPT ausente.');
    }
    this.aiInstance = new OpenAI({ apiKey });
    this.model = this.configService.get<string>('OPENAI_MODEL') ?? 'gpt-4.1-mini';
  }

  async execute(
    context: ChatContext,
    question: string,
    history: { role: 'user' | 'assistant'; content: string }[],
  ): Promise<{ response: string }> {
    try {
      const systemPrompt = getCustomContent(context, 'chat-gpt');
      const messages: ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: question },
      ];

      const response = await this.aiInstance.chat.completions.create({
        model: this.model,
        messages,
        max_tokens: dynamicMaxTokens[context],
        temperature: dynamicTemperature[context],
      });

      const choice = response.choices[0];
      if (choice?.finish_reason && choice.finish_reason !== 'stop') {
        this.logger.warn(`Resposta do ChatGPT finalizada com ${choice.finish_reason}`);
      }

      const assistantReply = choice?.message?.content ?? '';
      return { response: assistantReply };
    } catch (error) {
      this.logger.error('Erro na chamada do ChatGPT', error as Error);
      throw error;
    }
  }
}
