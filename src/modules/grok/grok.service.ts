import OpenAI from 'openai';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatCompletionMessageParam } from 'openai/resources/chat';
import {
  dynamicMaxTokens,
  dynamicTemperature,
  getCustomContent,
} from 'src/utils/getCustomContent';
import { ChatContext } from 'src/shared/global.service';

@Injectable()
export class GrokService {
  private readonly logger = new Logger(GrokService.name);
  private readonly aiInstance: OpenAI;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GROK_API_KEY');
    const configuredBaseURL =
      this.configService.get<string>('GROK_API_BASE_URL') ?? 'https://api.x.ai/v1';
    const baseURL = configuredBaseURL.replace(/\/$/, '').endsWith('/v1')
      ? configuredBaseURL.replace(/\/$/, '')
      : `${configuredBaseURL.replace(/\/$/, '')}/v1`;

    if (!apiKey) {
      this.logger.error('GROK_API_KEY não configurada');
      throw new Error('Configuração da API Grok ausente.');
    }

    this.aiInstance = new OpenAI({ apiKey, baseURL });
    this.model = this.configService.get<string>('GROK_MODEL') ?? 'grok-4.3';
  }

  async execute(
    context: ChatContext,
    question: string,
    history: { role: 'user' | 'assistant'; content: string }[],
  ): Promise<{ response: string }> {
    try {
      const systemPrompt = getCustomContent(context, 'grok');
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
        this.logger.warn(`Resposta do Grok finalizada com ${choice.finish_reason}`);
      }

      const assistantReply = choice?.message?.content ?? '';
      return { response: assistantReply };
    } catch (error) {
      this.logger.error('Erro na chamada do Grok', error as Error);
      throw new Error('Erro na requisição para o Grok.');
    }
  }
}
