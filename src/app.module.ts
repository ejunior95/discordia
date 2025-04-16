import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HttpModule } from '@nestjs/axios';
import { Agent } from 'https';
import { ConfigModule } from '@nestjs/config';
import { ChatGptModule } from './modules/chat-gpt/chat-gpt.module';
import { DeepseekModule } from './modules/deepseek/deepseek.module';
import { GeminiModule } from './modules/gemini/gemini.module';
import { DeepseekService } from './modules/deepseek/deepseek.service';
import { GeminiService } from './modules/gemini/gemini.service';
import { ChatGptService } from './modules/chat-gpt/chat-gpt.service';
import { GrokModule } from './modules/grok/grok.module';
import { GrokService } from './modules/grok/grok.service';

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
    GrokModule,
  ],
  controllers: [AppController],
  providers: [
    AppService, 
    DeepseekService, 
    GeminiService, 
    ChatGptService,
    GrokService
  ],
})
export class AppModule {}
