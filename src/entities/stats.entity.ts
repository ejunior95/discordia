import {
  Entity,
  ObjectIdColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';
import { ObjectId } from 'mongodb';
import type { AgentName } from '../shared/global.service';

export interface StatsByAgent {
  wins: number;
  rounds: number;
  votes: number;
  streak: number;
  lastWinAt?: Date | null;
}

export interface WeeklyBucket {
  weekStart: Date;
  byAgent: Record<AgentName, number>;
}

@Entity('stats')
export class Stats {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  scope: string;

  @Column()
  totals: {
    rounds: number;
    questions: number;
    votes: number;
  };

  @Column()
  byAgent: Record<AgentName, StatsByAgent>;

  @Column()
  weekly: WeeklyBucket[];

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
