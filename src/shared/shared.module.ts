import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { History } from 'src/entities/history.entity';
import { IA_Agent } from 'src/entities/agent.entity';
import { HistoryService } from './history.service';
import { S3Service } from './s3.service';
import { EmailService } from './email.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([History, IA_Agent])],
  providers: [HistoryService, S3Service, EmailService],
  exports: [HistoryService, S3Service, EmailService, TypeOrmModule],
})
export class SharedModule {}
