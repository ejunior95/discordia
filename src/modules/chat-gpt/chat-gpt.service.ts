import OpenAI from 'openai';
import { Injectable, Logger } from '@nestjs/common';
import { dynamicTemperature, getCustomContent } from 'src/utils/getCustomContent';
import { ConfigService } from '@nestjs/config';
import { ChatCompletionMessageParam } from 'openai/resources/chat';
import { InjectRepository } from '@nestjs/typeorm';
import { IA_Agent } from 'src/entities/agent.entity';
import { MongoRepository } from 'typeorm';
import { History } from 'src/entities/history.entity';

@Injectable()
export class ChatGptService {
  private readonly logger = new Logger(ChatGptService.name);
  private aiInstance: OpenAI;
  private customContent: string;

  constructor(
    @InjectRepository(IA_Agent)
    private readonly agentRepository: MongoRepository<IA_Agent>,
    @InjectRepository(History)
    private readonly historyRepository: MongoRepository<History>,
    private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      this.logger.error('OPENAI_API_KEY não configurada');
      throw new Error('Configuração da API ChatGPT ausente.');
    }
    this.aiInstance = new OpenAI({ apiKey });
  }

  async execute(
    context: "chat" | "chess" | "hangman-chooser" | "hangman-guesser" | "jokenpo" | "rpg" | "rap-battle", 
    question: string,
    history: { role: 'user' | 'assistant'; content: string }[]): Promise<{ response: string }> {
    try {
      this.customContent = getCustomContent(context,'chat-gpt');
      const messages: ChatCompletionMessageParam[] = [
        { role: 'system', content: this.customContent },
        ...history,
        { role: 'user', content: question },
      ];

      const response = await this.aiInstance.chat.completions.create({
        model: 'gpt-4o',
        messages,
        max_tokens: 100,
        temperature: dynamicTemperature[context],
      });

      const assistantReply = response.choices[0].message.content;
      return { response: assistantReply ? assistantReply : '' };
    } catch (error) {
      console.error('Erro na chamada do ChatGPT:', error);
      throw error;
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

  async getAllAgents() {
    const myAssistants = await this.aiInstance.beta.assistants.list({order: "desc"});
    return myAssistants.data;
  }

}