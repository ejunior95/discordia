import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { Stats, StatsByAgent, WeeklyBucket } from '../../entities/stats.entity';
import { Round } from '../../entities/round.entity';
import { History } from '../../entities/history.entity';
import { ALLOWED_AGENTS, AgentName } from '../../shared/global.service';

const SCOPE = 'global';
const WEEKLY_WINDOW = 8;

// Contextos considerados "game" para fins de estatísticas de voto
const GAME_CONTEXTS = new Set([
  'rpg',
  'rap-battle',
  'chess',
  'jokenpo',
  'hangman-chooser',
  'hangman-guesser',
]);

function emptyByAgent(): Record<AgentName, StatsByAgent> {
  return ALLOWED_AGENTS.reduce(
    (acc, name) => {
      acc[name] = { wins: 0, rounds: 0, votes: 0, streak: 0, lastWinAt: null };
      return acc;
    },
    {} as Record<AgentName, StatsByAgent>,
  );
}

function emptyWeeklyByAgent(): Record<AgentName, number> {
  return ALLOWED_AGENTS.reduce(
    (acc, name) => {
      acc[name] = 0;
      return acc;
    },
    {} as Record<AgentName, number>,
  );
}

/** Segunda-feira UTC 00:00 da semana de `d`. */
function weekStartOf(d: Date): Date {
  const out = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
  const dow = out.getUTCDay(); // 0=domingo
  const diff = dow === 0 ? -6 : 1 - dow;
  out.setUTCDate(out.getUTCDate() + diff);
  return out;
}

@Injectable()
export class StatsService {
  private readonly logger = new Logger(StatsService.name);

  constructor(
    @InjectRepository(Stats)
    private readonly statsRepo: MongoRepository<Stats>,
    @InjectRepository(Round)
    private readonly roundsRepo: MongoRepository<Round>,
    @InjectRepository(History)
    private readonly historyRepo: MongoRepository<History>,
  ) {}

  private async ensureStats(): Promise<Stats> {
    const existing = await this.statsRepo.findOne({ where: { scope: SCOPE } });
    if (existing) return existing;

    const fresh = this.statsRepo.create({
      scope: SCOPE,
      totals: {
        rounds: 0,
        questions: 0,
        votes: 0,
        chatVotes: 0,
        gameVotes: 0,
        rpgBattles: 0,
        rapBattles: 0,
        gamesRounds: 0,
      },
      byAgent: emptyByAgent(),
      weekly: [],
    });
    return this.statsRepo.save(fresh);
  }

  /** Incrementa contadores quando um novo round de chat é criado (sem vencedor ainda). */
  async incrementOnNewRound(agentsWithResponse: AgentName[]): Promise<void> {
    const stats = await this.ensureStats();
    stats.totals.rounds += 1;
    stats.totals.questions += 1;
    for (const a of agentsWithResponse) {
      stats.byAgent[a].rounds += 1;
    }
    await this.statsRepo.save(stats);
  }

  /** Incrementa contadores globais e por agente quando uma ação de jogo acontece. */
  async incrementOnGameAction(context: string, agent: AgentName): Promise<void> {
    const stats = await this.ensureStats();
    stats.totals.rounds += 1;

    if (!stats.totals.gamesRounds) stats.totals.gamesRounds = 0;
    if (!stats.totals.rpgBattles) stats.totals.rpgBattles = 0;
    if (!stats.totals.rapBattles) stats.totals.rapBattles = 0;

    stats.totals.gamesRounds += 1;

    if (context === 'rpg') {
      stats.totals.rpgBattles += 1;
    } else if (context === 'rap-battle') {
      stats.totals.rapBattles += 1;
    }

    if (stats.byAgent[agent]) {
      stats.byAgent[agent].rounds += 1;
    }

    await this.statsRepo.save(stats);
  }

  /**
   * Incrementa contadores quando um voto é registrado em um round.
   *
   * @param winner  - Agente vencedor
   * @param votedAt - Momento do voto
   * @param context - Contexto do round ('chat' | 'rpg' | 'rap-battle' | ...)
   *                  Usado para discriminar chatVotes vs gameVotes nos totais.
   */
  async incrementOnVote(
    winner: AgentName,
    votedAt: Date,
    context?: string,
  ): Promise<void> {
    const stats = await this.ensureStats();

    // Garante que os campos existam (compatibilidade com documentos antigos)
    if (!stats.totals.chatVotes) stats.totals.chatVotes = 0;
    if (!stats.totals.gameVotes) stats.totals.gameVotes = 0;

    stats.totals.votes += 1;

    if (context && GAME_CONTEXTS.has(context)) {
      stats.totals.gameVotes += 1;
    } else {
      // Sem context ou context === 'chat' cai aqui
      stats.totals.chatVotes += 1;
    }

    const agentStats = stats.byAgent[winner];
    agentStats.wins += 1;
    agentStats.votes += 1;
    agentStats.streak += 1;
    agentStats.lastWinAt = votedAt;

    for (const a of ALLOWED_AGENTS) {
      if (a !== winner) stats.byAgent[a].streak = 0;
    }

    const wStart = weekStartOf(votedAt);
    let bucket = stats.weekly.find(
      (b) => new Date(b.weekStart).getTime() === wStart.getTime(),
    );
    if (!bucket) {
      bucket = { weekStart: wStart, byAgent: emptyWeeklyByAgent() };
      stats.weekly.push(bucket);
    }
    bucket.byAgent[winner] += 1;

    stats.weekly.sort(
      (a, b) =>
        new Date(a.weekStart).getTime() - new Date(b.weekStart).getTime(),
    );
    if (stats.weekly.length > WEEKLY_WINDOW) {
      stats.weekly = stats.weekly.slice(-WEEKLY_WINDOW);
    }

    await this.statsRepo.save(stats);
  }

  async getHomeSnapshot() {
    const stats = await this.ensureStats();

    const leaderboard = ALLOWED_AGENTS.map((agent) => ({
      agent,
      ...stats.byAgent[agent],
    })).sort((a, b) => b.wins - a.wins);

    const leader = leaderboard[0]?.wins > 0 ? leaderboard[0].agent : null;

    const seismicDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentWinners = await this.roundsRepo.find({
      where: {
        winner_agent: { $ne: null },
        voted_at: { $gte: seismicDaysAgo },
      },
    });
    const weeklyCount = emptyWeeklyByAgent();
    for (const r of recentWinners) {
      if (r.winner_agent) weeklyCount[r.winner_agent] += 1;
    }
    let iaOfWeek: {
      agent: AgentName;
      weeklyWins: number;
      streak: number;
    } | null = null;
    const ranked = ALLOWED_AGENTS.map((a) => ({
      agent: a,
      weeklyWins: weeklyCount[a],
    })).sort((a, b) => b.weeklyWins - a.weeklyWins);
    if (ranked[0]?.weeklyWins > 0) {
      iaOfWeek = {
        agent: ranked[0].agent,
        weeklyWins: ranked[0].weeklyWins,
        streak: stats.byAgent[ranked[0].agent].streak,
      };
    }

    const weeklySorted = [...stats.weekly].sort(
      (a, b) =>
        new Date(a.weekStart).getTime() - new Date(b.weekStart).getTime(),
    );
    const today = new Date();
    const filled: WeeklyBucket[] = [];
    for (let i = WEEKLY_WINDOW - 1; i >= 0; i--) {
      const target = weekStartOf(
        new Date(today.getTime() - i * 7 * 24 * 60 * 60 * 1000),
      );
      const found = weeklySorted.find(
        (b) => new Date(b.weekStart).getTime() === target.getTime(),
      );
      filled.push(
        found ?? { weekStart: target, byAgent: emptyWeeklyByAgent() },
      );
    }

    const recent = await this.roundsRepo.find({
      where: { winner_agent: { $ne: null } },
      order: { voted_at: 'DESC' } as never,
      take: 5,
    });

    return {
      totals: stats.totals,
      leader,
      leaderboard,
      iaOfWeek,
      weekly: filled.map((b) => ({
        weekStart: b.weekStart,
        byAgent: b.byAgent,
      })),
      recent: recent.map((r) => ({
        id: r._id.toString(),
        question: r.question,
        winner: r.winner_agent,
        votedAt: r.voted_at,
        createdAt: r.created_at,
      })),
    };
  }

  async getUserStats(userId: string) {
    const rounds = await this.roundsRepo.find({ where: { user_id: userId } });

    const totalRounds = rounds.length;
    const voted = rounds.filter((r) => !!r.winner_agent && !!r.voted_at);
    const totalVotes = voted.length;

    const votesByAgent = emptyWeeklyByAgent();
    for (const r of voted) {
      if (r.winner_agent) votesByAgent[r.winner_agent] += 1;
    }

    const uniqueAgentsVoted = ALLOWED_AGENTS.filter(
      (a) => votesByAgent[a] > 0,
    ).length;

    let topAgent: AgentName | null = null;
    let topAgentVotes = 0;
    for (const a of ALLOWED_AGENTS) {
      if (votesByAgent[a] > topAgentVotes) {
        topAgent = a;
        topAgentVotes = votesByAgent[a];
      }
    }
    const topAgentShare = totalVotes > 0 ? topAgentVotes / totalVotes : 0;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const roundsThisMonth = rounds.filter(
      (r) => new Date(r.created_at).getTime() >= monthStart.getTime(),
    ).length;

    return {
      totalRounds,
      totalVotes,
      uniqueAgentsVoted,
      votesByAgent,
      topAgent,
      topAgentVotes,
      topAgentShare,
      roundsThisMonth,
    };
  }

  async getRecentUserRounds(userId: string, limit = 5) {
    const rounds = await this.roundsRepo.find({
      where: { user_id: userId },
    });
    const sorted = [...rounds].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    return sorted.slice(0, limit).map((r) => ({
      id: r._id.toString(),
      question: r.question,
      winner: r.winner_agent ?? null,
      askedAt: r.created_at,
      votedAt: r.voted_at ?? null,
    }));
  }

  async recompute(): Promise<Stats> {
    const allRounds = await this.roundsRepo.find();

    const gameHistories = await this.historyRepo.find({
      where: {
        role: 'assistant',
        context: { $in: ['rpg', 'rap-battle', 'chess', 'jokenpo', 'hangman-chooser', 'hangman-guesser'] },
      },
    });

    const fresh: Pick<Stats, 'scope' | 'totals' | 'byAgent' | 'weekly'> = {
      scope: SCOPE,
      totals: {
        rounds: 0,
        questions: 0,
        votes: 0,
        chatVotes: 0,
        gameVotes: 0,
        rpgVotes: 0,
        rapVotes: 0,
        rpgBattles: 0,
        rapBattles: 0,
        gamesRounds: 0,
      },
      byAgent: emptyByAgent(),
      weekly: [],
    };

    const sortedRounds = [...allRounds].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );

    let lastWinner: AgentName | null = null;

    for (const r of sortedRounds) {
      fresh.totals.rounds += 1;
      fresh.totals.questions += 1;
      for (const resp of r.responses) {
        if (resp.content && fresh.byAgent[resp.agent]) {
          fresh.byAgent[resp.agent].rounds += 1;
        }
      }
      if (r.winner_agent && r.voted_at) {
        fresh.totals.votes += 1;

        const roundContext = (r as Round & { context?: string }).context;
        if (roundContext && GAME_CONTEXTS.has(roundContext)) {
          fresh.totals.gameVotes += 1;
        } else {
          fresh.totals.chatVotes += 1;
        }

        const ag = fresh.byAgent[r.winner_agent];
        ag.wins += 1;
        ag.votes += 1;
        ag.lastWinAt = r.voted_at;
        if (lastWinner === r.winner_agent) ag.streak += 1;
        else {
          for (const a of ALLOWED_AGENTS) fresh.byAgent[a].streak = 0;
          ag.streak = 1;
        }
        lastWinner = r.winner_agent;

        const wStart = weekStartOf(new Date(r.voted_at));
        let bucket = fresh.weekly.find(
          (b) => new Date(b.weekStart).getTime() === wStart.getTime(),
        );
        if (!bucket) {
          bucket = { weekStart: wStart, byAgent: emptyWeeklyByAgent() };
          fresh.weekly.push(bucket);
        }
        bucket.byAgent[r.winner_agent] += 1;
      }
    }

    for (const history of gameHistories) {
      fresh.totals.gamesRounds += 1;

      if (history.context === 'rpg') {
        fresh.totals.rpgBattles += 1;
      } else if (history.context === 'rap-battle') {
        fresh.totals.rapBattles += 1;
      }

      const agentName = history.agent_id as AgentName;
      if (agentName && fresh.byAgent[agentName]) {
        fresh.byAgent[agentName].rounds += 1;
      }
    }

    fresh.weekly.sort(
      (a, b) => new Date(a.weekStart).getTime() - new Date(b.weekStart).getTime(),
    );
    if (fresh.weekly.length > WEEKLY_WINDOW) {
      fresh.weekly = fresh.weekly.slice(-WEEKLY_WINDOW);
    }

    const existing = await this.statsRepo.findOne({ where: { scope: SCOPE } });
    if (existing) {
      Object.assign(existing, fresh);
      return this.statsRepo.save(existing);
    }
    return this.statsRepo.save(this.statsRepo.create(fresh));
  }
}