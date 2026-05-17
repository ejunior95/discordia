import {
  Entity,
  ObjectIdColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ObjectId } from 'mongodb';

@Entity('payment_methods')
export class PaymentMethod {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  user_id: string;

  @Column()
  brand: string;

  @Column()
  last4: string;

  @Column()
  holder: string;

  @Column()
  exp_month: number;

  @Column()
  exp_year: number;

  @Column({ default: true })
  is_default: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
