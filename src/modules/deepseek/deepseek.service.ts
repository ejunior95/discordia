import { HttpService } from '@nestjs/axios';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { getCustomContent } from 'src/utils/getCustomContent';

@Injectable()
export class DeepseekService {
  private readonly customContent: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService
  ) {
    this.customContent = getCustomContent('deepseek');
  }

  async execute(question: string): Promise<string> {
    const baseURL = this.configService.get<string>('DEEPSEEK_API_BASE_URL');
    const apiKey = this.configService.get<string>('DEEPSEEK_API_KEY');

    if (!baseURL || !apiKey) {
      console.error('⚠️ Deepseek config ausente:', { baseURL, apiKey });
      throw new InternalServerErrorException('Configuração da API Deepseek ausente.');
    }

    try {
      const response = await lastValueFrom(
        this.httpService.post(
          `${baseURL}/chat/completions`,
          {
            model: 'deepseek-reasoner',
            messages: [
              { role: 'system', content: this.customContent },
              { role: 'user', content: question }
            ],
            max_tokens: 250,
            temperature: 0.7
          },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
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
        console.warn('⚠️ Resposta da Deepseek veio sem conteúdo:', response.data);
        throw new InternalServerErrorException('Resposta vazia da Deepseek.');
      }

      return answer;
    } catch (error) {
      console.error('❌ Erro na chamada Deepseek:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      throw new InternalServerErrorException('Erro na requisição para o Deepseek.');
    }
  }
}
