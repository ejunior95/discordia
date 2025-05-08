import { Module } from '@nestjs/common';
import { GeminiController } from './gemini.controller';
import { GeminiService } from './gemini.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IA_Agent } from 'src/entities/agent.entity';
import { ChatHistory } from 'src/entities/chat-history.entity';
import { HangmanHistory } from 'src/entities/hangman-history.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      IA_Agent,
      ChatHistory,
      HangmanHistory,
    ]),
  ],
  controllers: [GeminiController],
  providers: [GeminiService]
})
export class GeminiModule {}
