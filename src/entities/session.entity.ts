import { 
  Entity, 
  ObjectIdColumn, 
  Column, 
  ObjectId, 
  CreateDateColumn 
} from 'typeorm';
  
  @Entity('sessions')
  export class Session {
    @ObjectIdColumn()
    _id: ObjectId;

    @Column()
    user_id: string;
  
    @Column()
    context:  'chat' | 'chess' | 'hangman-chooser' | 'hangman-guesser' | 'jokenpo' | 'rpg' | 'rap-battle';
  
    @Column()
    agent_ids: string[];
  
    @Column({ type: 'timestamp' })
    finished_at: Date;
    
    @CreateDateColumn({ type: 'timestamp' })
    created_at: Date;
  }
  