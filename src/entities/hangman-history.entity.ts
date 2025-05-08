import {
    Entity,
    ObjectIdColumn,
    Column,
    CreateDateColumn,
  } from 'typeorm';
  import { ObjectId } from 'mongodb';
  
  @Entity('hangman-history')
  export class HangmanHistory {
    @ObjectIdColumn()
    _id: ObjectId;
  
    @Column()
    question: string;
  
    @Column()
    answer: string;
  
    @Column()
    agent_id: string;
  
    @CreateDateColumn({ type: 'timestamp' })
    created_at: Date;
  }
  