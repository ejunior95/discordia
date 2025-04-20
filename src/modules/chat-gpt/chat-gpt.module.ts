import { Module } from '@nestjs/common';
import { ChatGptController } from './chat-gpt.controller';
import { ChatGptService } from './chat-gpt.service';

@Module({
  controllers: [ChatGptController],
  providers: [ChatGptService]
})
export class ChatGptModule {}
