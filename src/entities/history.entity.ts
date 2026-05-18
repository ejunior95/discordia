import {
  Entity,
  ObjectIdColumn,
  Column,
  ObjectId,
  CreateDateColumn,
} from 'typeorm';

@Entity('histories')
export class History {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  user_id: string;

  @Column()
  role: 'user' | 'assistant';

  @Column()
  context:
    | 'chat'
    | 'chess'
    | 'hangman-chooser'
    | 'hangman-guesser'
    | 'jokenpo'
    | 'rpg'
    | 'rap-battle';

  @Column()
  content: string;

  @Column({ nullable: true })
  agent_id?: string;

  @Column({ nullable: true })
  audio_url?: string;

  @Column({ nullable: true })
  audio_meta?: {
    provider: 'sunor' | 'elevenlabs';
    status?: 'pending' | 'ready' | 'failed';
    taskId?: string;
    clipId?: string;
    voiceId?: string;
    model?: string;
    durationSec?: number;
    error?: string;
  };

  @CreateDateColumn({ type: 'timestamp' })
  created_at?: Date;
}
