import {
  Entity,
  ObjectIdColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ObjectId } from 'mongodb';

export type PlanSlug = 'free' | 'pro' | 'premium';

export interface PlanPricing {
  monthly: number;
  yearly: number;
}

@Entity('plans')
export class Plan {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column({ unique: true })
  slug: PlanSlug;

  @Column()
  name: string;

  @Column()
  description: string;

  @Column({ type: 'json' })
  pricing: PlanPricing;

  @Column({ type: 'json' })
  features: string[];

  @Column({ nullable: true })
  monthlyRoundsLimit?: number | null;

  @Column({ default: false })
  highlight: boolean;

  @Column()
  cta: string;

  @Column({ default: true })
  active: boolean;

  @Column({ default: 0 })
  order: number;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
