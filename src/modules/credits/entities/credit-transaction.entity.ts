import {
  Entity,
  ObjectIdColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { ObjectId } from 'mongodb';

export type CreditTxType =
  | 'debit' // cobrança por uso
  | 'refund' // estorno (ex: falha em API externa)
  | 'grant' // crédito manual (admin)
  | 'monthly_reset' // renovação mensal de allowance
  | 'purchase' // futura compra via Stripe
  | 'role_exempt'; // chamada autorizada de admin/beta_tester (audit-only, amount=0)

/**
 * Tabela append-only de movimentações da carteira de créditos.
 * Toda mudança de saldo DEVE passar por aqui — auditoria 100%.
 */
@Entity('credit_transactions')
export class CreditTransaction {
  @ObjectIdColumn()
  _id: ObjectId;

  @Index()
  @Column()
  user_id: string;

  @Column()
  type: CreditTxType;

  /** Valor com sinal: negativo para débito, positivo para crédito. */
  @Column()
  amount: number;

  /** Saldo após a aplicação desta transação. */
  @Column()
  balance_after: number;

  @Column()
  reason: string;

  /** Categoria do uso (ex: 'CHAT_ASK_ALL', 'GAME_ACTION', 'MUSIC_GEN'). */
  @Column({ nullable: true })
  action_type?: string;

  /** Identificador do recurso consumido (roundId, sessionId, taskId etc). */
  @Column({ nullable: true })
  action_id?: string;

  /**
   * Chave de idempotência para impedir cobrança duplicada (header HTTP).
   * NÃO usar índice único+sparse aqui porque o driver Mongo serializa undefined
   * como ausência do campo de forma inconsistente e pode gerar E11000 em null
   * duplicado. A idempotência é garantida pelo CreditsService (lookup antes do
   * insert). Mantemos só um índice simples para acelerar a busca.
   */
  @Index()
  @Column({ nullable: true })
  idempotency_key?: string;

  /** Para refunds: id da transação debit original. */
  @Column({ nullable: true })
  refund_of?: string;

  /** Para grants/admin: id do usuário que executou. */
  @Column({ nullable: true })
  performed_by?: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
}
