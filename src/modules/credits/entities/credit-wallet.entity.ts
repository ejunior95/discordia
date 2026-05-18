import {
  Entity,
  ObjectIdColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ObjectId } from 'mongodb';

@Entity('credit_wallets')
export class CreditWallet {
  @ObjectIdColumn()
  _id: ObjectId;

  @Index({ unique: true })
  @Column()
  user_id: string;

  /** Saldo atual. Nunca pode ficar negativo (garantido por filtro atômico). */
  @Column({ default: 0 })
  balance: number;

  /** Quantidade de créditos concedidos no início do ciclo atual. */
  @Column({ default: 0 })
  monthly_allowance: number;

  /**
   * Teto de fair-use efetivo para o ciclo (igual a monthly_allowance no caso
   * de planos com soft cap). Mantido aqui para auditoria.
   */
  @Column({ nullable: true })
  soft_cap?: number | null;

  /** Slug do plano vigente no início do ciclo (snapshot, evita lookup). */
  @Column()
  plan_slug: string;

  @Column({ type: 'timestamp' })
  period_start: Date;

  @Column({ type: 'timestamp' })
  period_end: Date;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
