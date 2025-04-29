import Anthropic from '@anthropic-ai/sdk';
import { MessageParam } from '@anthropic-ai/sdk/resources';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getCustomContent } from 'src/utils/getCustomContent';

@Injectable()
export class GrokService {
  private readonly logger = new Logger(GrokService.name);
  private readonly aiInstance: Anthropic;
  private readonly customContent: string;
  private readonly baseURL: string;
  private readonly apiKey: string;

  constructor(
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('GROK_API_KEY') ?? '';
    this.baseURL = this.configService.get<string>('GROK_API_BASE_URL') ?? '';
    if (!this.apiKey) {
      this.logger.error('GROK_API_KEY não configurada');
      throw new Error('Configuração da API Grok ausente.');
    }
    this.aiInstance =  new Anthropic({
      apiKey: this.apiKey,
      baseURL: this.baseURL
    });
    this.customContent = getCustomContent('grok');
  }

  async execute(question: string, history: { role: "user" | "assistant"; content: string; }[]): Promise<{ response: string }> {
    try {
      const messages: MessageParam[] = [
        ...history,
        { role: 'user', content: question },
      ];

      const response = await this.aiInstance.messages.create({
        model: 'grok-3-beta',
        max_tokens: 100,
        system: this.customContent,
        messages,
        temperature: 0.7
      });

      // @ts-ignore
      const assistantReply = response.content[0].text;
      return { response: assistantReply };
    } catch (error) {
      console.error('Erro na chamada do Grok:', {
        message: error.message,
        status: error.status,
        details: error
      });
      throw new Error('Erro na requisição para o Grok.');
    }
  }
}