import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

@Injectable()
export class MinimaxService {
  private readonly logger = new Logger(MinimaxService.name);
  private readonly client: Anthropic;
  private readonly model: string;
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('ANTHROPIC_API_KEY') ?? '';
    this.model =
      this.config.get<string>('MINIMAX_MODEL') ?? 'MiniMax-M2.7-highspeed';
    this.baseUrl =
      this.config.get<string>('ANTHROPIC_BASE_URL') ??
      'https://api.minimax.io/anthropic';

    if (!apiKey) {
      this.logger.warn('ANTHROPIC_API_KEY não configurada.');
    }

    this.client = new Anthropic({
      apiKey,
      baseURL: this.baseUrl,
    });

    this.logger.log(`MiniMax pronto (model=${this.model}).`);
  }

  async execute(
    question: string,
    history: ChatMessage[] = [],
    system?: string,
  ): Promise<{ response: string }> {
    const messages: Anthropic.MessageParam[] = [
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: question },
    ];

    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: 256,
      system,
      messages,
    });

    const response = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('')
      .trim();

    if (!response) {
      throw new Error('MiniMax retornou resposta vazia.');
    }

    return { response };
  }
}
