import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenAI } from "@google/genai";
import { getCustomContent } from 'src/utils/getCustomContent';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { ChatHistory } from 'src/entities/chat-history.entity';
import { MongoRepository } from 'typeorm';
import { IA_Agent } from 'src/entities/agent.entity';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private aiInstance: GoogleGenAI;
  private customContent: string;

  constructor(
    @InjectRepository(IA_Agent)
    private readonly agentRepository: MongoRepository<IA_Agent>,
    @InjectRepository(ChatHistory)
    private readonly chatHistoryRepository: MongoRepository<ChatHistory>,
    private readonly configService: ConfigService
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      this.logger.error('GEMINI_API_KEY não configurada');
      throw new Error('Configuração da API Gemini ausente.');
    }
    this.aiInstance = new GoogleGenAI({apiKey});
  }

  async execute(
    typeContext: "chat" | "chess" | "hangman-chooser" | "hangman-guesser" | "jokenpo" | "rpg" | "rap-battle", 
    question: string, 
    history: { role: 'user' | 'assistant'; content: string }[]): Promise<{ response: string }> {
    try {
      this.customContent = getCustomContent(typeContext,'gemini');
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