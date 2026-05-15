import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { History } from 'src/entities/history.entity';
import { IA_Agent } from 'src/entities/agent.entity';
import { ChatContext } from './global.service';

@Injectable()
export class HistoryService {
  constructor(
    @InjectRepository(History)
    private readonly historyRepository: MongoRepository<History>,
    @InjectRepository(IA_Agent)
    private readonly agentRepository: MongoRepository<IA_Agent>,
  ) {}

  async getRecent(userId: string, limit: number, context: ChatContext) {
    const messages = await this.historyRepository.find({
      where: { user_id: userId, context },
      order: { created_at: 'DESC' },
      take: limit,
    });
    return messages.reverse().map((msg) => ({ role: msg.role, content: msg.content }));
  }

  async clear(context: ChatContext) {
    await this.historyRepository.deleteMany({ context });
  }

  async add(
    context: ChatContext,
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
    if (!agent) throw new NotFoundException(`Agente ${name} não encontrado`);
    return agent._id.toString();
  }
}
