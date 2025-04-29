import { Entity, ObjectIdColumn, Column, ObjectId } from 'typeorm';

@Entity()
export class ConversationMessage {
  @ObjectIdColumn()
  id: ObjectId;

  @Column()
  user_id: string;

  @Column()
  timestamp: Date;

  @Column()
  role: 'user' | 'assistant';

  @Column()
  content: string;

  @Column({ nullable: true })
  agent_id?: string;
}