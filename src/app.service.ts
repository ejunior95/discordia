import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { ChatGptService } from './modules/chat-gpt/chat-gpt.service';
import { DeepseekService } from './modules/deepseek/deepseek.service';
import { GeminiService } from './modules/gemini/gemini.service';
import { GrokService } from './modules/grok/grok.service';
import { IA_Agent } from './entities/agent.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { MongoServerError, ObjectId } from 'mongodb';
import { CreateAgentDto, UpdateAgentDto } from './dtos/create-agent.dto';
import { Session } from './entities/session.entity';
import { Round } from './entities/round.entity';
import { AgentName, ChatContext } from './shared/global.service';
import { HistoryService } from './shared/history.service';
import { S3Service } from './shared/s3.service';
import { ElevenLabsService } from './modules/tts/elevenlabs.service';
import { MusicGenerationService } from './modules/music-generation/music-generation.service';
import { StatsService } from './modules/stats/stats.service';
import { CreditsService } from './modules/credits/credits.service';
import { CREDIT_COSTS } from './modules/credits/credit-costs';
import { v4 as uuid } from 'uuid';
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
export class AppService implements OnModuleInit {
  private readonly logger = new Logger(AppService.name);
  private readonly providers: Record<AgentName, AiProvider>;

  constructor(
    @InjectRepository(IA_Agent)
    private readonly agentRepository: MongoRepository<IA_Agent>,
    @InjectRepository(Session)
    private readonly sessionRepository: MongoRepository<Session>,
    @InjectRepository(Round)
    private readonly roundRepository: MongoRepository<Round>,
    private readonly chatGptService: ChatGptService,
    private readonly deepseekService: DeepseekService,
    private readonly geminiService: GeminiService,
    private readonly grokService: GrokService,
    private readonly historyService: HistoryService,
    private readonly s3Service: S3Service,
    private readonly elevenLabsService: ElevenLabsService,
    private readonly musicGenerationService: MusicGenerationService,
    private readonly statsService: StatsService,
    private readonly creditsService: CreditsService,
  ) {
    this.providers = {
      'chat-gpt': this.chatGptService,
      gemini: this.geminiService,
      deepseek: this.deepseekService,
      grok: this.grokService,
    };
  }

  async onModuleInit() {
    await this.seedDefaultAgents();
  }

  private async seedDefaultAgents() {
    const defaults: { name: AgentName; label: string; model: string }[] = [
      { name: 'chat-gpt', label: 'ChatGPT', model: this.chatGptService.getModelName() },
      { name: 'gemini', label: 'Gemini', model: this.geminiService.getModelName() },
      { name: 'deepseek', label: 'DeepSeek', model: this.deepseekService.getModelName() },
      { name: 'grok', label: 'Grok', model: this.grokService.getModelName() },
    ];

    for (const def of defaults) {
      try {
        const existing = await this.agentRepository.findOne({ where: { name: def.name } });
        if (!existing) {
          await this.agentRepository.save(this.agentRepository.create(def));
          this.logger.log(`Agent seed criado: ${def.name} (${def.model})`);
          continue;
        }
        // mantém label/model atualizados conforme env
        if (existing.model !== def.model || !existing.label) {
          existing.model = def.model;
          existing.label = existing.label || def.label;
          await this.agentRepository.save(existing);
          this.logger.log(`Agent atualizado: ${def.name} -> model=${def.model}`);
        }
      } catch (err) {
        this.logger.error(`Falha no seed do agente ${def.name}: ${(err as Error).message}`);
      }
    }
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

    // Persiste o round e atualiza stats
    const roundDoc = this.roundRepository.create({
      user_id: userId,
      question,
      responses: agents.map((name) => ({
        agent: name,
        content: responses[name].response,
        error: responses[name].error,
      })),
      winner_agent: null,
      voted_at: null,
    });
    const savedRound = await this.roundRepository.save(roundDoc);
    const agentsWithResponse = agents.filter((name) => responses[name].response);
    try {
      await this.statsService.incrementOnNewRound(agentsWithResponse);
    } catch (err) {
      this.logger.error(`Falha ao atualizar stats no novo round: ${(err as Error).message}`);
    }

    return { roundId: savedRound._id.toString(), responses };
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

    // RPG: gerar TTS sincronamente quando o turno é do mestre. Falha aborta o turno.
    const rpgCampaign =
      context === 'rpg' && typeof payload.campaign === 'object' && payload.campaign !== null
        ? (payload.campaign as Record<string, unknown>)
        : null;
    const isRpgMasterTurn = rpgCampaign?.master === agent;

    if (context === 'rpg' && isRpgMasterTurn && result.response?.trim()) {
      // Cobra TTS antes de chamar ElevenLabs. Falha aborta o turno.
      const ttsCharge = await this.creditsService.charge(userId, {
        amount: CREDIT_COSTS.TTS_RESPONSE,
        action: 'TTS_RESPONSE',
        reason: 'rpg_master_tts',
      });
      try {
        const tts = await this.elevenLabsService.synthesize(result.response);
        const key = `rpg-audio/${userId}/${uuid()}.mp3`;
        const audioUrl = await this.s3Service.uploadBuffer(tts.buffer, key, tts.mimeType);

        await this.historyService.add(context, userId, 'assistant', result.response, agent, {
          audioUrl,
          audioMeta: {
            provider: 'elevenlabs',
            status: 'ready',
            voiceId: tts.voiceId,
            model: tts.model,
          },
        });

        return { [agent]: { ...result, audio_url: audioUrl } };
      } catch (error) {
        this.logger.error(`Falha TTS RPG: ${(error as Error).message}`);
        // Estorna a cobrança porque o turno foi abortado.
        if (ttsCharge.transactionId) {
          await this.creditsService
            .refund(ttsCharge.transactionId, 'tts_synthesis_failed')
            .catch(() => undefined);
        }
        // NÃO persiste history do assistant — turno é abortado.
        throw error;
      }
    }

    // Rap battle: cria task no Sunor (fire-and-attach). Falha NÃO aborta o verso.
    if (context === 'rap-battle' && result.response?.trim()) {
      // Cobra MUSIC_GEN ANTES de submeter para o Suno (evita abuso via polling).
      const musicCharge = await this.creditsService.charge(userId, {
        amount: CREDIT_COSTS.MUSIC_GEN,
        action: 'MUSIC_GEN',
        reason: 'rap_battle_music_submit',
      });
      const historyId = await this.historyService.add(
        context,
        userId,
        'assistant',
        result.response,
        agent,
      );
      const theme = typeof payload.theme === 'string' ? payload.theme : '';
      try {
        const musicResult = await this.musicGenerationService.createRapVerseTask(
          historyId,
          result.response,
          theme,
          userId,
        );
        return { [agent]: { ...result, ...musicResult } };
      } catch (error) {
        // Submissão falhou ANTES de gerar a música → estorna.
        if (musicCharge.transactionId) {
          await this.creditsService
            .refund(musicCharge.transactionId, 'music_submit_failed')
            .catch(() => undefined);
        }
        throw error;
      }
    }

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

  async updateIaAgent(id: string, data: UpdateAgentDto) {
    const agent = await this.agentRepository.findOneBy({ _id: new ObjectId(id) });
    if (!agent) {
      throw new NotFoundException('Agente de IA não encontrado');
    }
    if (data.label !== undefined) agent.label = data.label;
    if (data.model !== undefined) agent.model = data.model;
    return this.agentRepository.save(agent);
  }

  async voteOnRound(roundId: string, agent: AgentName, userId: string) {
    let _id: ObjectId;
    try {
      _id = new ObjectId(roundId);
    } catch {
      throw new BadRequestException('ID de round inválido');
    }

    const round = await this.roundRepository.findOne({ where: { _id } });
    if (!round) throw new NotFoundException('Round não encontrado');
    if (round.user_id !== userId) {
      throw new ForbiddenException('Apenas o autor do round pode votar');
    }
    if (round.winner_agent) {
      throw new ConflictException('Voto já registrado para este round');
    }
    const hasResponse = round.responses.find((r) => r.agent === agent && r.content);
    if (!hasResponse) {
      throw new BadRequestException('Agente não respondeu neste round');
    }

    const votedAt = new Date();
    // Update atômico: só grava se ainda não houver vencedor
    const result = await this.roundRepository.findOneAndUpdate(
      { _id, winner_agent: null },
      { $set: { winner_agent: agent, voted_at: votedAt } },
      { returnDocument: 'after' },
    );
    const updated = (result as unknown as { value: Round | null })?.value ?? result;
    if (!updated || (updated as Round).winner_agent !== agent) {
      throw new ConflictException('Voto já registrado para este round');
    }

    try {
      await this.statsService.incrementOnVote(agent, votedAt);
    } catch (err) {
      this.logger.error(`Falha ao atualizar stats no voto: ${(err as Error).message}`);
    }

    return { roundId, winner: agent, votedAt };
  }
}
