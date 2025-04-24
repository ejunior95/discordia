import {
    Entity,
    ObjectIdColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
  } from 'typeorm';
  import { ObjectId } from 'mongodb';
  
  @Entity('agents')
  export class IA_Agent {
    @ObjectIdColumn()
    _id: ObjectId;
  
    @Column({ unique: true })
    name: string;
  
    @Column({ default: 0 })
    score: number;
  
    @CreateDateColumn({ type: 'timestamp' })
    created_at?: Date;
  
    @UpdateDateColumn({ type: 'timestamp' })
    updated_at?: Date;
  
    @DeleteDateColumn({ type: 'timestamp', nullable: true })
    deleted_at?: Date;
  }
  