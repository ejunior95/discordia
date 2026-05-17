import {
  Entity,
  ObjectIdColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { ObjectId } from 'mongodb';

export type InvoiceStatus = 'paid' | 'pending' | 'failed';
export type InvoiceCurrency = 'BRL' | 'USD';

@Entity('invoices')
export class Invoice {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  user_id: string;

  @Column({ nullable: true })
  subscription_id?: string;

  /** Identificador externo do gateway (mock por enquanto). */
  @Column()
  external_id: string;

  @Column({ type: 'timestamp' })
  date: Date;

  @Column()
  description: string;

  @Column()
  amount: number;

  @Column()
  currency: InvoiceCurrency;

  @Column()
  status: InvoiceStatus;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
}
