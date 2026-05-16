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
    this.model =
      this.configService.get<string>('GEMINI_MODEL') ?? 'gemini-3.1-flash-lite';
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

      const config = {
        systemInstruction: systemPrompt,
        maxOutputTokens: dynamicMaxTokens[context],
        temperature: dynamicTemperature[context],
        thinkingConfig: {
          includeThoughts: false,
          thinkingBudget: 0,
        },
      };

      let response = await this.aiInstance.models.generateContent({
        model: this.model,
        contents,
        config,
      });

      let responseText = response.text ?? '';
      let candidate = response.candidates?.[0];
      let continuationAttempts = 0;

      while (
        context === 'chat' &&
        candidate?.finishReason === 'MAX_TOKENS' &&
        continuationAttempts < 2
      ) {
        continuationAttempts += 1;
        this.logger.warn(
          `Resposta do Gemini atingiu MAX_TOKENS; solicitando continuação ${continuationAttempts}.`,
        );

        response = await this.aiInstance.models.generateContent({
          model: this.model,
          contents: [
            ...contents,
            { role: 'model', parts: [{ text: responseText }] },
            {
              role: 'user',
              parts: [
                {
                  text: 'Continue exatamente de onde parou. Não repita o trecho anterior e conclua a resposta.',
                },
              ],
            },
          ],
          config,
        });

        responseText += response.text ? `\n${response.text}` : '';
        candidate = response.candidates?.[0];
      }

      if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
        const usage = response.usageMetadata;
        this.logger.warn(
          `Resposta do Gemini finalizada com ${candidate.finishReason}${
            candidate.finishMessage ? `: ${candidate.finishMessage}` : ''
          }. Tokens: prompt=${usage?.promptTokenCount ?? 'n/a'}, resposta=${
            usage?.candidatesTokenCount ?? 'n/a'
          }, pensamentos=${usage?.thoughtsTokenCount ?? 'n/a'}, total=${
            usage?.totalTokenCount ?? 'n/a'
          }`,
        );
      }

      return { response: responseText };
    } catch (error) {
      this.logger.error('Erro na chamada do Gemini', error as Error);
      throw error;
    }
  }
}
