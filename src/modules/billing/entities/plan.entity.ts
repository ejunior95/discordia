import {
  Entity,
  ObjectIdColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ObjectId } from 'mongodb';

export type PlanSlug = 'free' | 'basic' | 'premium';

/**
 * Recursos da plataforma que cada plano libera.
 * Usados pelo CreditsGuard para bloquear endpoints (defense in depth).
 */
export type PlanCapability = 'chat' | 'games' | 'audio' | 'music';

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

  /** Bullet points de marketing (texto livre). */
  @Column({ type: 'json' })
  features: string[];

  /** Capabilities reais que o plano libera (usadas em runtime para gating). */
  @Column({ type: 'json', default: [] })
  capabilities: PlanCapability[];

  /** Quantidade de créditos concedidos a cada renovação mensal. */
  @Column({ default: 0 })
  monthlyCredits: number;

  /**
   * Se definido, o plano é exibido como "ilimitado" no front, mas internamente
   * aplica este teto mensal de fair-use para conter abuso (ex: Suno em massa).
   */
  @Column({ nullable: true })
  unlimitedSoftCap?: number | null;

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
