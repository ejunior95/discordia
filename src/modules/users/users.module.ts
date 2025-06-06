import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { S3Service } from 'src/shared/s3.service';
import { EmailService } from 'src/shared/email.service';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [
    UsersService, 
    S3Service, 
    EmailService, 
    JwtService
  ],
  exports: [UsersService],
})
export class UsersModule {}
