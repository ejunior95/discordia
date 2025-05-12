import { Module } from '@nestjs/common';
import { DeepseekController } from './deepseek.controller';
import { DeepseekService } from './deepseek.service';
import { HttpModule } from '@nestjs/axios';
import { Agent } from 'https';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IA_Agent } from 'src/entities/agent.entity';
import { History } from 'src/entities/history.entity';

@Module({
  imports: [
    HttpModule.register({
      httpsAgent: new Agent({
        requestCert: true,
        rejectUnauthorized: true
      }),
    }),
    TypeOrmModule.forFeature([
      IA_Agent,
      History,
    ]),
  ],
  controllers: [DeepseekController],
  providers: [DeepseekService]
})
export class DeepseekModule {}
