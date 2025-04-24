import {
    Entity,
    ObjectIdColumn,
    Column,
    CreateDateColumn,
  } from 'typeorm';
  import { ObjectId } from 'mongodb';
  
  @Entity('questions')
  export class Question {
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
  