import { Module } from '@nestjs/common';
import { GeminiController } from './gemini.controller';
import { GeminiService } from './gemini.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IA_Agent } from 'src/entities/agent.entity';
import { Question } from 'src/entities/question.entity';
import { ConversationMessage } from 'src/entities/chat-history.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      IA_Agent, 
      Question,
      ConversationMessage,
    ]),
  ],
  controllers: [GeminiController],
  providers: [GeminiService]
})
export class GeminiModule {}
