import { Module } from '@nestjs/common';
import { GeminiController } from './gemini.controller';
import { GeminiService } from './gemini.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IA_Agent } from 'src/entities/agent.entity';
import { History } from 'src/entities/history.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      IA_Agent,
      History,
    ]),
  ],
  controllers: [GeminiController],
  providers: [GeminiService]
})
export class GeminiModule {}
