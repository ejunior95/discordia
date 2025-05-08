import { Module } from '@nestjs/common';
import { ChatGptController } from './chat-gpt.controller';
import { ChatGptService } from './chat-gpt.service';
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
  controllers: [ChatGptController],
  providers: [ChatGptService]
})
export class ChatGptModule {}
