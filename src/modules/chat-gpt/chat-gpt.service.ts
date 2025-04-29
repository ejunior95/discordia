import OpenAI from 'openai';
import { Injectable, Logger } from '@nestjs/common';
import { getCustomContent } from 'src/utils/getCustomContent';
import { ConfigService } from '@nestjs/config';
import { ChatCompletionMessageParam } from 'openai/resources/chat';
import { InjectRepository } from '@nestjs/typeorm';
import { IA_Agent } from 'src/entities/agent.entity';
import { MongoRepository } from 'typeorm';
import { ConversationMessage } from 'src/entities/chat-history.entity';

@Injectable()
export class ChatGptService {
  private readonly logger = new Logger(ChatGptService.name);
  private aiInstance: OpenAI;
  private customContent = getCustomContent('chat-gpt');

  constructor(
    @InjectRepository(IA_Agent)
    private readonly agentRepository: MongoRepository<IA_Agent>,
    @InjectRepository(ConversationMessage)
    private readonly conversationMessageRepository: MongoRepository<ConversationMessage>,
    private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      this.logger.error('OPENAI_API_KEY não configurada');
      throw new Error('Configuração da API ChatGPT ausente.');
    }
    this.aiInstance = new OpenAI({ apiKey });
  }

  async execute(question: string, history: { role: 'user' | 'assistant'; content: string }[]): Promise<{ response: string }> {
    try {
      const messages: ChatCompletionMessageParam[] = [
        { role: 'system', content: this.customContent },
        ...history,
        { role: 'user', content: question },
      ];

      const response = await this.aiInstance.chat.completions.create({
        model: 'gpt-4o',
        messages,
        max_tokens: 100,
        temperature: 0.7,
      });

      const assistantReply = response.choices[0].message.content;
      return { response: assistantReply ? assistantReply : '' };
    } catch (error) {
      console.error('Erro na chamada do ChatGPT:', error);
      throw error;
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