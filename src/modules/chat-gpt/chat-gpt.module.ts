import { Module } from '@nestjs/common';
import { ChatGptController } from './chat-gpt.controller';
import { ChatGptService } from './chat-gpt.service';
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
  controllers: [ChatGptController],
  providers: [ChatGptService]
})
export class ChatGptModule {}
