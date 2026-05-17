import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ChatGptModule } from './modules/chat-gpt/chat-gpt.module';
import { DeepseekModule } from './modules/deepseek/deepseek.module';
import { GeminiModule } from './modules/gemini/gemini.module';
import { GrokModule } from './modules/grok/grok.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { IA_Agent } from './entities/agent.entity';
import { Session } from './entities/session.entity';
import { SharedModule } from './shared/shared.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TtsModule } from './modules/tts/tts.module';
import { MusicGenerationModule } from './modules/music-generation/music-generation.module';
import { StatsModule } from './modules/stats/stats.module';
import { Round } from './entities/round.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 5 },
      { name: 'medium', ttl: 60000, limit: 60 },
    ]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const user = configService.get<string>('USER_DATABASE');
        const pass = configService.get<string>('PASS_DATABASE');
        const dbName = configService.get<string>('DATABASE_NAME');
        const nodeEnv = configService.get<string>('NODE_ENV');

        return {
          type: 'mongodb',
          url: `mongodb+srv://${user}:${pass}@cluster-discordia.mkximuw.mongodb.net/${dbName}?retryWrites=true&w=majority&appName=cluster-discordia`,
          database: dbName,
          synchronize: nodeEnv !== 'production',
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
        };
      },
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([IA_Agent, Session, Round]),
    SharedModule,
    StatsModule,
    ChatGptModule,
    DeepseekModule,
    GeminiModule,
    GrokModule,
    UsersModule,
    AuthModule,
    TtsModule,
    MusicGenerationModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
