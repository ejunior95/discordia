import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ChatGptService } from './modules/chat-gpt/chat-gpt.service';
import { DeepseekService } from './modules/deepseek/deepseek.service';
import { GeminiService } from './modules/gemini/gemini.service';
import { GrokService } from './modules/grok/grok.service';
import { IA_Agent } from './entities/agent.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { MongoServerError, ObjectId } from 'mongodb';
import { CreateAgentDto } from './dtos/create-agent.dto';
import { Session } from './entities/session.entity';
import { AgentName, ChatContext } from './shared/global.service';
import { HistoryService } from './shared/history.service';
import {
  buildGameActionPrompt,
  GameActionContext,
  summarizeGameAction,
} from './utils/gamePromptBuilders';

interface AiProvider {
  execute(
    context: ChatContext,
    question: string,
    history: { role: 'user' | 'assistant'; content: string }[],
  ): Promise<{ response: string }>;
}

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);
  private readonly providers: Record<AgentName, AiProvider>;

  constructor(
    @InjectRepository(IA_Agent)
    private readonly agentRepository: MongoRepository<IA_Agent>,
    @InjectRepository(Session)
    private readonly sessionRepository: MongoRepository<Session>,
    private readonly chatGptService: ChatGptService,
    private readonly deepseekService: DeepseekService,
    private readonly geminiService: GeminiService,
    private readonly grokService: GrokService,
    private readonly historyService: HistoryService,
  ) {
    this.providers = {
      'chat-gpt': this.chatGptService,
      gemini: this.geminiService,
      deepseek: this.deepseekService,
      grok: this.grokService,
    };
  }

  async askToAll(question: string, userId: string) {
    const history = await this.historyService.getRecent(userId, 10, 'chat');

    const agents: AgentName[] = ['gemini', 'deepseek', 'chat-gpt', 'grok'];
    const settled = await Promise.allSettled(
      agents.map((name) => this.providers[name].execute('chat', question, history)),
    );

    const responses: Record<string, { response: string; error?: string }> = {};
    agents.forEach((name, i) => {
      const result = settled[i];
      if (result.status === 'fulfilled') {
        responses[name] = { response: result.value.response };
      } else {
        this.logger.error(`Erro do agente ${name}: ${result.reason?.message ?? result.reason}`);
        responses[name] = { response: '', error: 'Falha ao consultar este agente' };
      }
    });

    await this.historyService.add('chat', userId, 'user', question);
    await Promise.all(
      agents
        .filter((name) => responses[name].response)
        .map((name) =>
          this.historyService.add('chat', userId, 'assistant', responses[name].response, name),
        ),
    );

    return responses;
  }

  async askToOne(question: string, agent: AgentName, userId: string) {
    const provider = this.providers[agent];
    if (!provider) {
      throw new BadRequestException(`Agente de IA "${agent}" não é suportado.`);
    }

    const history = await this.historyService.getRecent(userId, 10, 'chat');
    const result = await provider.execute('chat', question, history);

    await this.historyService.add('chat', userId, 'user', question);
    await this.historyService.add('chat', userId, 'assistant', result.response, agent);

    return { [agent]: result };
  }

  async askGameAction(
    context: GameActionContext,
    agent: AgentName,
    payload: Record<string, unknown>,
    userId: string,
  ) {
    const provider = this.providers[agent];
    if (!provider) {
      throw new BadRequestException(`Agente de IA "${agent}" não é suportado.`);
    }

    const prompt = buildGameActionPrompt(context, agent, payload);
  const result = await provider.execute(context, prompt, []);

    await this.historyService.add(context, userId, 'user', summarizeGameAction(context, payload));
    await this.historyService.add(context, userId, 'assistant', result.response, agent);

    return { [agent]: result };
  }

  async startSession(context: ChatContext, agents: AgentName[], userId: string) {
    const agentIds: string[] = [];
    for (const agent of agents) {
      const agentId = agent ? await this.historyService.getAgentIdByName(agent) : '';
      agentIds.push(agentId);
    }

    const newSession = this.sessionRepository.create({
      user_id: userId,
      context,
      agent_ids: agentIds,
    });
    const result = await this.sessionRepository.save(newSession);
    return { session_id: result._id.toString() };
  }

  async finishSession(id: string) {
    const session = await this.sessionRepository.findOne({
      where: { _id: new ObjectId(id), finished_at: null },
    });
    if (!session) throw new NotFoundException('Sessão já encerrada');
    await this.sessionRepository.update(id, { finished_at: new Date() });
  }

  async findSessionById(id: string) {
    return this.sessionRepository.findOne({
      where: { _id: new ObjectId(id), finished_at: null },
    });
  }

  async clearAllHistory(context: ChatContext) {
    await this.historyService.clear(context);
  }

  async hangmanGame(
    context: 'hangman-chooser' | 'hangman-guesser',
    question: string,
    agent: AgentName,
    userId: string,
  ) {
    const provider = this.providers[agent];
    if (!provider) {
      throw new BadRequestException(`Agente de IA "${agent}" não é suportado.`);
    }

    const history = await this.historyService.getRecent(userId, 100, context);
    const result = await provider.execute(context, question, history);

    await this.historyService.add(context, userId, 'user', question);
    await this.historyService.add(context, userId, 'assistant', result.response, agent);

    return { [agent]: result };
  }

  async createAgent(data: CreateAgentDto): Promise<IA_Agent> {
    try {
      const agent = this.agentRepository.create(data);
      return await this.agentRepository.save(agent);
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        throw new BadRequestException('Agente de IA já cadastrado!');
      }
      throw error;
    }
  }

  async findAllIaAgents(): Promise<IA_Agent[]> {
    return this.agentRepository.find({ where: { deleted_at: null } });
  }

  async findOnIaAgent(id: string): Promise<IA_Agent> {
    const agent = await this.agentRepository.findOne({
      where: { _id: new ObjectId(id), deleted_at: null },
    });
    if (!agent) throw new NotFoundException('Agente de IA não encontrado');
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
