import {
    Entity,
    ObjectIdColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
  } from 'typeorm';
  import { ObjectId } from 'mongodb';
  import { Exclude } from 'class-transformer';

  export class UserSocials {
    twitter?: string;
    github?: string;
    linkedin?: string;
  }

  export type UserRole = 'user' | 'admin' | 'beta_tester';

  @Entity('users')
  export class User {
    @ObjectIdColumn()
    _id: ObjectId;
  
    @Column()
    name: string;
  
    @Column({ unique: true })
    email: string;
  
    @Exclude()
    @Column()
    password: string;
  
    @Column({ nullable: true })
    avatar?: string;

    @Column({ default: false })
    isVerified: boolean;

    @Column({ default: 'user' })
    role: UserRole;

    @Column({ nullable: true })
    bio?: string;

    @Column({ type: 'json', nullable: true })
    socials?: UserSocials;

    @Column({ type: 'timestamp', nullable: true })
    terms_accepted_at?: Date;
  
    @CreateDateColumn({ type: 'timestamp' })
    created_at: Date;
  
    @UpdateDateColumn({ type: 'timestamp' })
    updated_at: Date;
  
    @DeleteDateColumn({ type: 'timestamp', nullable: true })
    deleted_at?: Date;
  }
  