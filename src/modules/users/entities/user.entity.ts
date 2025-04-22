import {
    Entity,
    ObjectIdColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
  } from 'typeorm';
  import { ObjectId } from 'mongodb';
  
  @Entity('users')
  export class User {
    @ObjectIdColumn()
    _id: ObjectId;
  
    @Column()
    name: string;
  
    @Column({ unique: true })
    email: string;
  
    @Column()
    password: string;
  
    @Column({ nullable: true })
    avatar?: string;

    @Column({ default: false })
    isVerified: boolean;
  
    @CreateDateColumn({ type: 'timestamp' })
    created_at: Date;
  
    @UpdateDateColumn({ type: 'timestamp' })
    updated_at: Date;
  
    @DeleteDateColumn({ type: 'timestamp', nullable: true })
    deleted_at?: Date;
  }
  