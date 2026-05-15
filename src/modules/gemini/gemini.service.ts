import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import {
  dynamicMaxTokens,
  dynamicTemperature,
  getCustomContent,
} from 'src/utils/getCustomContent';
import { ConfigService } from '@nestjs/config';
import { ChatContext } from 'src/shared/global.service';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly aiInstance: GoogleGenAI;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      this.logger.error('GEMINI_API_KEY não configurada');
      throw new Error('Configuração da API Gemini ausente.');
    }
    this.aiInstance = new GoogleGenAI({ apiKey });
    this.model = this.configService.get<string>('GEMINI_MODEL') ?? 'gemini-2.5-flash';
  }

  async execute(
    context: ChatContext,
    question: string,
    history: { role: 'user' | 'assistant'; content: string }[],
  ): Promise<{ response: string }> {
    try {
      const systemPrompt = getCustomContent(context, 'gemini');

      const contents = [
        ...history.map((msg) => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }],
        })),
        { role: 'user', parts: [{ text: question }] },
      ];

      const { text } = await this.aiInstance.models.generateContent({
        model: this.model,
        contents,
        config: {
          systemInstruction: systemPrompt,
          maxOutputTokens: dynamicMaxTokens[context],
          temperature: dynamicTemperature[context],
        },
      });

      return { response: text ?? '' };
    } catch (error) {
      this.logger.error('Erro na chamada do Gemini', error as Error);
      throw error;
    }
  }
}
