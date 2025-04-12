import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChatGptModule } from './chat-gpt/chat-gpt.module';
import { DeepseekModule } from './deepseek/deepseek.module';
import { GeminiModule } from './gemini/gemini.module';
import { DeepseekService } from './deepseek/deepseek.service';
import { GeminiService } from './gemini/gemini.service';
import { ChatGptService } from './chat-gpt/chat-gpt.service';
import { HttpModule } from '@nestjs/axios';
import { Agent } from 'https';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    HttpModule.register({
      httpsAgent: new Agent({
        requestCert: true,
        rejectUnauthorized: true
      }),
    }),
    ConfigModule,
    ChatGptModule, 
    DeepseekModule, 
    GeminiModule,
  ],
  controllers: [AppController],
  providers: [
    AppService, 
    DeepseekService, 
    GeminiService, 
    ChatGptService,
  ],
})
export class AppModule {}
