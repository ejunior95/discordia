import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HttpModule } from '@nestjs/axios';
import { Agent } from 'https';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ChatGptModule } from './modules/chat-gpt/chat-gpt.module';
import { DeepseekModule } from './modules/deepseek/deepseek.module';
import { GeminiModule } from './modules/gemini/gemini.module';
import { DeepseekService } from './modules/deepseek/deepseek.service';
import { GeminiService } from './modules/gemini/gemini.service';
import { ChatGptService } from './modules/chat-gpt/chat-gpt.service';
import { GrokModule } from './modules/grok/grok.module';
import { GrokService } from './modules/grok/grok.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { IA_Agent } from './entities/agent.entity';
import { History } from './entities/history.entity';
import { Session } from './entities/session.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const user = configService.get<string>('USER_DATABASE');
        const pass = configService.get<string>('PASS_DATABASE');
        const dbName = configService.get<string>('DATABASE_NAME');

        return {
          type: 'mongodb',
          url: `mongodb+srv://${user}:${pass}@cluster-discordia.mkximuw.mongodb.net/${dbName}?retryWrites=true&w=majority&appName=cluster-discordia`,
          database: dbName,
          synchronize: true,
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
        };
      },
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([
      IA_Agent,
      History,
      Session,
    ]),
    HttpModule.register({
      httpsAgent: new Agent({
        requestCert: true,
        rejectUnauthorized: true,
      }),
    }),

    ChatGptModule,
    DeepseekModule,
    GeminiModule,
    GrokModule,
    UsersModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    DeepseekService,
    GeminiService,
    ChatGptService,
    GrokService,
  ],
})
export class AppModule {}
