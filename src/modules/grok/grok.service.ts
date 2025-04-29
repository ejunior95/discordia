import Anthropic from '@anthropic-ai/sdk';
import { MessageParam } from '@anthropic-ai/sdk/resources';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { IA_Agent } from 'src/entities/agent.entity';
import { ConversationMessage } from 'src/entities/chat-history.entity';
import { getCustomContent } from 'src/utils/getCustomContent';
import { MongoRepository } from 'typeorm';

@Injectable()
export class GrokService {
  private readonly logger = new Logger(GrokService.name);
  private readonly aiInstance: Anthropic;
  private readonly customContent: string;
  private readonly baseURL: string;
  private readonly apiKey: string;

  constructor(
    @InjectRepository(IA_Agent)
    private readonly agentRepository: MongoRepository<IA_Agent>,
    @InjectRepository(ConversationMessage)
    private readonly conversationMessageRepository: MongoRepository<ConversationMessage>,
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
  
  async getRecentHistory(userId: string, limit: number) {
    const messages = await this.conversationMessageRepository.find({
      where: { user_id: userId },
      order: { timestamp: 'DESC' },
      take: limit,
    });

    return messages.reverse().map(msg => ({ role: msg.role, content: msg.content }));
  }
  
  async saveMessage(userId: string, role: 'user' | 'assistant', content: string, agentName?: string) {
    const agentId = agentName ? await this.getAgentIdByName(agentName) : undefined;
    const message = this.conversationMessageRepository.create({
      user_id: userId,
      timestamp: new Date(),
      role,
      content,
      agent_id: agentId,
    });
    await this.conversationMessageRepository.save(message);
  }

  async getAgentIdByName(name: string): Promise<string> {
    const agent = await this.agentRepository.findOne({ where: { name } });
    if (!agent) throw new Error(`Agente ${name} não encontrado`);
    return agent._id.toString();
  }
}