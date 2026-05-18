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

  @Column()
  responses: RoundResponse[];

  @Column({ nullable: true })
  winner_agent?: AgentName | null;

  @Column({ nullable: true })
  voted_at?: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
}
