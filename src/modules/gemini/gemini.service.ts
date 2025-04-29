import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenAI } from "@google/genai";
import { getCustomContent } from 'src/utils/getCustomContent';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private aiInstance: GoogleGenAI;
  private customContent = getCustomContent('gemini');

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      this.logger.error('GEMINI_API_KEY não configurada');
      throw new Error('Configuração da API Gemini ausente.');
    }
    this.aiInstance = new GoogleGenAI({apiKey});
  }

  async execute(question: string, history: { role: 'user' | 'assistant'; content: string }[]): Promise<{ response: string }> {
    try {
      const contents = [
        { role: 'user', parts: [{ text: this.customContent }] },
        ...history.map((msg) => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          parts: [{ text: msg.content }],
        })),
        { role: 'user', parts: [{ text: question }] },
      ];

      const { text } = await this.aiInstance.models.generateContent({
        model: "gemini-2.0-flash",
        contents,
        config: {
          maxOutputTokens: 100,
          temperature: 0.7
        }
      });

      return { response: text ? text : '' };
    } catch (error) {
      this.logger.error('Erro na chamada do Gemini:', error);
      throw error;
    }
  }
}