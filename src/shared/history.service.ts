import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { ObjectId } from 'mongodb';
import { History } from 'src/entities/history.entity';
import { IA_Agent } from 'src/entities/agent.entity';
import { ChatContext } from './global.service';

type AudioMeta = NonNullable<History['audio_meta']>;

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
    return messages
      .reverse()
      .map((msg) => ({ role: msg.role, content: msg.content }));
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
    extras?: { audioUrl?: string; audioMeta?: AudioMeta },
  ): Promise<string> {
    const agentId = agentName
      ? await this.getAgentIdByName(agentName)
      : undefined;
    const message = this.historyRepository.create({
      user_id: userId,
      role,
      context,
      content,
      agent_id: agentId,
      audio_url: extras?.audioUrl,
      audio_meta: extras?.audioMeta,
    });
    const saved = await this.historyRepository.save(message);
    return saved._id.toString();
  }

  async attachAudioMeta(historyId: string, meta: AudioMeta): Promise<void> {
    await this.historyRepository.updateOne(
      { _id: new ObjectId(historyId) },
      { $set: { audio_meta: meta } },
    );
  }

  async setAudioUrl(
    historyId: string,
    audioUrl: string,
    meta?: AudioMeta,
  ): Promise<void> {
    const update: Record<string, unknown> = { audio_url: audioUrl };
    if (meta) update.audio_meta = meta;
    await this.historyRepository.updateOne(
      { _id: new ObjectId(historyId) },
      { $set: update },
    );
  }

  async findByTaskId(taskId: string): Promise<History | null> {
    return this.historyRepository.findOne({
      where: { 'audio_meta.taskId': taskId },
    });
  }

  async setLyricsTimings(
    historyId: string,
    timings: Array<{ word: string; start: number; end: number }>,
    karaokeStatus: 'ready' | 'failed',
  ): Promise<void> {
    await this.historyRepository.updateOne(
      { _id: new ObjectId(historyId) },
      {
        $set: {
          'audio_meta.lyricsTimings': timings,
          'audio_meta.karaokeStatus': karaokeStatus,
        },
      },
    );
  }

  async getAgentIdByName(name: string): Promise<string> {
    const agent = await this.agentRepository.findOne({ where: { name } });
    if (!agent) throw new NotFoundException(`Agente ${name} não encontrado`);
    return agent._id.toString();
  }
}
