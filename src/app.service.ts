import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ChatGptService } from './modules/chat-gpt/chat-gpt.service';
import { DeepseekService } from './modules/deepseek/deepseek.service';
import { GeminiService } from './modules/gemini/gemini.service';
import { GrokService } from './modules/grok/grok.service';
import { IA_Agent } from './entities/agent.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository} from 'typeorm';
import { MongoServerError, ObjectId } from 'mongodb';
import { CreateAgentDto } from './dtos/create-agent.dto';
import { History } from './entities/history.entity';

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(IA_Agent)
    private readonly agentRepository: MongoRepository<IA_Agent>,
    @InjectRepository(History)
    private readonly historyRepository: MongoRepository<History>,
    private readonly chatGptService: ChatGptService,
    private readonly deepseekService: DeepseekService,
    private readonly geminiService: GeminiService,
    private readonly grokService: GrokService,
  ) {}

  async askToAll(question: string, userId: string) {
    try {
      const history = await this.getRecentHistory(userId, 10, 'chat');
  
      const [geminiRes, deepseekRes, chatGptRes, grokRes] = await Promise.all([
        this.geminiService.execute('chat', question, history),
        this.deepseekService.execute('chat', question, history),
        this.chatGptService.execute('chat', question, history),
        this.grokService.execute('chat', question, history),
      ]);
  
      await this.addHistory('chat', userId, 'user', question);
      await Promise.all([
        this.addHistory(
          'chat',
          userId, 
          'assistant', 
          geminiRes.response ? geminiRes.response : '', 
          'gemini'
        ),
        this.addHistory(
          'chat',
          userId, 
          'assistant', 
          deepseekRes.response, 
          'deepseek'
        ),
        this.addHistory(
          'chat',
          userId, 
          'assistant', 
          chatGptRes.response ? chatGptRes.response : '', 
          'chat-gpt'
        ),
        this.addHistory(
          'chat',
          userId, 
          'assistant', 
          grokRes.response, 
          'grok'
        ),
      ]);
  
      return {
        'gemini': { response: geminiRes.response },
        'deepseek': { response: deepseekRes.response },
        'chat-gpt': { response: chatGptRes.response },
        'grok': { response: grokRes.response },
      };
    } catch (error) {
      console.error('Erro no askToAll:', error);
      throw error;
    }
  }

  async askToOne(question: string, agent: string, userId: string) {
    try {
      const history = await this.getRecentHistory(userId, 10, 'chat');

      const agentExecutors = {
        'deepseek': async () => await this.deepseekService.execute('chat',question, history),
        'gemini': async () => await this.geminiService.execute('chat',question, history),
        'chat-gpt': async () => await this.chatGptService.execute('chat',question, history),
        'grok': async () => await this.grokService.execute('chat',question, history)
      };
  
      const executor = agentExecutors[agent];
  
      if (!executor) {
        throw new Error(`Agente de IA "${agent}" não é suportado.`);
      }

      const result = await executor();

      await this.addHistory('chat', userId, 'user', question);
      this.addHistory('chat', userId, 'assistant', result?.response, agent);

      return { [agent]: result };
  
    } catch (error) {
      console.error('Erro no askToOne:', error);
      return { error: error.message || 'Erro interno' };
    }
  }
  
  async getRecentHistory(
    userId: string, 
    limit: number,
    context:  "chat" | "chess" | "hangman-chooser" | "hangman-guesser" | "jokenpo" | "rpg" | "rap-battle"
  ) {
    const messages = await this.historyRepository.find({
      where: { 
        user_id: userId,
        context
      },
      order: { created_at: 'DESC' },
      take: limit,
    });

    return messages.reverse().map(msg => ({ role: msg.role, content: msg.content }));
  }

  async clearAllHistory(
    context:  "chat" | "chess" | "hangman-chooser" | "hangman-guesser" | "jokenpo" | "rpg" | "rap-battle"
  ) {
     await this.historyRepository.deleteMany({context})
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
  
  async hangmanGame(
    context: "hangman-chooser" | "hangman-guesser",  
    question: string,
    agent: string, 
    userId: string,
    ) {
    try {

      const history = await this.getRecentHistory(userId, 100, context);

      const agentExecutors = {
        'deepseek': async () => await this.deepseekService.execute(context, question, history),
        'gemini': async () => await this.geminiService.execute(context, question, history),
        'chat-gpt': async () => await this.chatGptService.execute(context, question, history),
        'grok': async () => await this.grokService.execute(context, question, history)
      };
  
      const executor = agentExecutors[agent];
  
      if (!executor) {
        throw new Error(`Agente de IA "${agent}" não é suportado.`);
      }

      const result = await executor();

      await this.addHistory(context, userId, 'user', question);
      this.addHistory(context, userId, 'assistant', result?.response, agent);

      return { [agent]: result };
  
    } catch (error) {
      console.error('Erro no askToOne:', error);
      return { error: error.message || 'Erro interno' };
    }
  }
  
  async createAgent(data: CreateAgentDto): Promise<IA_Agent> {
    try {
      const user = this.agentRepository.create(data);
      return await this.agentRepository.save(user);
    } catch (error) {
      if (error instanceof MongoServerError && error?.code === 11000) {
        throw new BadRequestException('Agente de IA já cadastrado!');
      }
      throw error;
    }
  }  
  
  async findAllIaAgents(): Promise<IA_Agent[]> {
    return this.agentRepository.find({
      where: { deleted_at: null },
    });
  }

  async findOnIaAgent(id: string): Promise<IA_Agent | null> {
    const agent = await this.agentRepository.findOne({
      where: {
        _id: new ObjectId(id),
        deleted_at: null,
      },
    });
    if (!agent) throw new NotFoundException('Usuário não encontrado');
    return agent;
  }

  async updateIaAgent(id: string, data: { score: number }) {
    const agent = await this.agentRepository.findOneBy({ _id: new ObjectId(id) });
    if (!agent) {
      throw new NotFoundException('Agente de IA não encontrado');
    }
  
    Object.assign(agent, data);
    return this.agentRepository.save(agent);
  }
}
