import { Entity, ObjectIdColumn, Column, CreateDateColumn } from 'typeorm';
import { ObjectId } from 'mongodb';
import type { AgentName } from '../shared/global.service';

export interface RoundResponse {
  agent: AgentName;
  content: string;
  error?: string;
}

@Entity('rounds')
export class Round {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  user_id: string;

  @Column()
  question: string;

  @Column({ nullable: true })
  context?: string;

  /**
   * Identificador estável da partida/campanha à qual o round pertence.
   * - rap-battle: id da batalha
   * - rpg: id da campanha
   * Permite contar batalhas/campanhas distintas (em vez de ações/turnos).
   */
  @Column({ nullable: true })
  game_id?: string;

  /** Tema da batalha de rima (context = 'rap-battle'). */
  @Column({ nullable: true })
  theme?: string;

  /** Cenário da campanha de RPG (context = 'rpg'), ex.: 'fantasy'. */
  @Column({ nullable: true })
  scenario?: string;

  /** Rótulo/descrição amigável do cenário de RPG (ex.: prompt customizado). */
  @Column({ nullable: true })
  scenarioLabel?: string;

  @Column({ nullable: true })
  game_status?: string;

  @Column({ nullable: true })
  game_detail?: Record<string, unknown>;

  @Column()
  responses: RoundResponse[];

  @Column({ nullable: true })
  winner_agent?: AgentName | null;

  @Column({ nullable: true })
  voted_at?: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
}