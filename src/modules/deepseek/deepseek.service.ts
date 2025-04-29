import { HttpService } from '@nestjs/axios';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { getCustomContent } from 'src/utils/getCustomContent';

@Injectable()
export class DeepseekService {
  private readonly logger = new Logger(DeepseekService.name);
  private readonly customContent: string;
  private readonly baseURL: string;
  private readonly apiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('DEEPSEEK_API_KEY') ?? '';
    this.baseURL = this.configService.get<string>('DEEPSEEK_API_BASE_URL') ?? '';
    if (!this.apiKey) {
      this.logger.error('DEEPSEEK_API_KEY não configurada');
      throw new Error('Configuração da API Deepseek ausente.');
    }
    this.customContent = getCustomContent('deepseek');
  }

  async execute(question: string, history: { role: "user" | "assistant"; content: string; }[]) {
    if (!this.baseURL || !this.apiKey) {
      console.error('Deepseek config ausente:', { baseURL: this.baseURL, apiKey: this.apiKey });
      throw new InternalServerErrorException('Configuração da API Deepseek ausente.');
    }

    try {
      const messages = [
        { role: 'system', content: this.customContent },
        ...history,
        { role: 'user', content: question },
      ];

      const response = await lastValueFrom(
        this.httpService.post(
          `${this.baseURL}/chat/completions`,
          {
            model: 'deepseek-chat',
            messages,
            max_tokens: 100,
            temperature: 0.7
          },
          {
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
              Accept: 'application/json'
            }
          }
        )
      );

      const answer = response.data?.choices?.[0]?.message?.content ||
                     response.data?.result?.text ||
                     response.data?.text;

      if (!answer) {
        console.warn('Resposta da Deepseek veio sem conteúdo:', response.data);
        throw new InternalServerErrorException('Resposta vazia da Deepseek.');
      }

      return { response: answer };
    } catch (error) {
      console.error('Erro na chamada Deepseek:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      throw new InternalServerErrorException('Erro na requisição para o Deepseek.');
    }
  }
}