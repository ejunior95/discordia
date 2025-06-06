import Anthropic from '@anthropic-ai/sdk';
import { MessageParam } from '@anthropic-ai/sdk/resources';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { IA_Agent } from 'src/entities/agent.entity';
import { History } from 'src/entities/history.entity';
import { dynamicTemperature, getCustomContent } from 'src/utils/getCustomContent';
import { MongoRepository } from 'typeorm';

@Injectable()
export class GrokService {
  private readonly logger = new Logger(GrokService.name);
  private readonly aiInstance: Anthropic;
  private readonly baseURL: string;
  private readonly apiKey: string;
  private customContent: string;

  constructor(
    @InjectRepository(IA_Agent)
    private readonly agentRepository: MongoRepository<IA_Agent>,
    @InjectRepository(History)
    private readonly historyRepository: MongoRepository<History>,
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
  }

  async execute(
    context: "chat" | "chess" | "hangman-chooser" | "hangman-guesser" | "jokenpo" | "rpg" | "rap-battle", 
    question: string, 
    history: { role: "user" | "assistant"; content: string; }[]): Promise<{ response: string }> {
    try {
      this.customContent = getCustomContent(context,'grok');
      const messages: MessageParam[] = [
        ...history,
        { role: 'user', content: question },
      ];

      const response = await this.aiInstance.messages.create({
        model: 'grok-3-beta',
        max_tokens: 100,
        system: this.customContent,
        messages,
        temperature: dynamicTemperature[context],
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
    const messages = await this.historyRepository.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
      take: limit,
    });

    return messages.reverse().map(msg => ({ role: msg.role, content: msg.content }));
  }
  
  async addHistory(
    context:  "chat" | "chess" | "hangman-chooser" | "hangman-guesser" | "jokenpo" | "rpg" | "rap-battle",
    userId: string, 
    role: 'user' | 'assistant', 
    content: string, 
    agentName?: string,
  ) {
    const agentId = agentName ? await this.getAgentIdByName(agentName) : undefined;
    const message = this.historyRepository.create({
      user_id: userId,
      role,
      context,
      content,
      agent_id: agentId,
    });
    await this.historyRepository.save(message);
  }

  async getAgentIdByName(name: string): Promise<string> {
    const agent = await this.agentRepository.findOne({ where: { name } });
    if (!agent) throw new Error(`Agente ${name} não encontrado`);
    return agent._id.toString();
  }
}