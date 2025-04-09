import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChatGptModule } from './chat-gpt/chat-gpt.module';
import { DeepseekModule } from './deepseek/deepseek.module';
import { GeminiModule } from './gemini/gemini.module';

@Module({
  imports: [ChatGptModule, DeepseekModule, GeminiModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
