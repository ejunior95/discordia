import { HttpService } from '@nestjs/axios';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { lastValueFrom } from 'rxjs';
import { IA_Agent } from 'src/entities/agent.entity';
import { ChatHistory } from 'src/entities/chat-history.entity';
import { getCustomContent } from 'src/utils/getCustomContent';
import { MongoRepository } from 'typeorm';

@Injectable()
export class DeepseekService {
  private readonly logger = new Logger(DeepseekService.name);
  private readonly customContent: string;
  private readonly baseURL: string;
  private readonly apiKey: string;

  constructor(
    @InjectRepository(IA_Agent)
    private readonly agentRepository: MongoRepository<IA_Agent>,
    @InjectRepository(ChatHistory)
    private readonly chatHistoryRepository: MongoRepository<ChatHistory>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('DEEPSEEK_API_KEY') ?? '';
    this.baseURL = this.configService.get<string>('DEEPSEEK_API_BASE_URL') ?? '';
    if (!this.apiKey) {
      this.logger.error('DEEPSEEK_API_KEY não configurada');
      throw new Error('Configuração da API Deepseek ausente.');
    }
    this.customContent = getCustomContent('deepseek', 'chat');
  }

  async execute(question: string, history: { role: "user" | "assistant"; content: string; }[]): Promise<{ response: string }> {
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
  
  async getRecentHistory(userId: string, limit: number) {
    const messages = await this.chatHistoryRepository.find({
      where: { user_id: userId },
      order: { timestamp: 'DESC' },
      take: limit,
    });

    return messages.reverse().map(msg => ({ role: msg.role, content: msg.content }));
  }
  
  async saveMessage(userId: string, role: 'user' | 'assistant', content: string, agentName?: string) {
    const agentId = agentName ? await this.getAgentIdByName(agentName) : undefined;
    const message = this.chatHistoryRepository.create({
      user_id: userId,
      timestamp: new Date(),
      role,
      content,
      agent_id: agentId,
    });
    await this.chatHistoryRepository.save(message);
  }

  async getAgentIdByName(name: string): Promise<string> {
    const agent = await this.agentRepository.findOne({ where: { name } });
    if (!agent) throw new Error(`Agente ${name} não encontrado`);
    return agent._id.toString();
  }
}