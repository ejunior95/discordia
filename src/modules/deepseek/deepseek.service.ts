import OpenAI from 'openai';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatCompletionMessageParam } from 'openai/resources/chat';
import {
  dynamicMaxTokens,
  dynamicTemperature,
  getCustomContent,
} from 'src/utils/getCustomContent';
import { ChatContext } from 'src/shared/global.service';

@Injectable()
export class DeepseekService {
  private readonly logger = new Logger(DeepseekService.name);
  private readonly aiInstance: OpenAI;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('DEEPSEEK_API_KEY');
    const baseURL =
      this.configService.get<string>('DEEPSEEK_API_BASE_URL') ?? 'https://api.deepseek.com/v1';

    if (!apiKey) {
      this.logger.error('DEEPSEEK_API_KEY não configurada');
      throw new Error('Configuração da API Deepseek ausente.');
    }

    this.aiInstance = new OpenAI({ apiKey, baseURL });
    this.model = this.configService.get<string>('DEEPSEEK_MODEL') ?? 'deepseek-v4-flash';
  }

  async execute(
    context: ChatContext,
    question: string,
    history: { role: 'user' | 'assistant'; content: string }[],
  ): Promise<{ response: string }> {
    try {
      const systemPrompt = getCustomContent(context, 'deepseek');
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
        this.logger.warn(`Resposta da Deepseek finalizada com ${choice.finish_reason}`);
      }

      const answer = choice?.message?.content;
      if (!answer) {
        this.logger.warn('Resposta da Deepseek veio sem conteúdo');
        throw new InternalServerErrorException('Resposta vazia da Deepseek.');
      }

      return { response: answer };
    } catch (error) {
      this.logger.error('Erro na chamada Deepseek', error as Error);
      throw new InternalServerErrorException('Erro na requisição para o Deepseek.');
    }
  }
}
