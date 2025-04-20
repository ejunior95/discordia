import { Module } from '@nestjs/common';
import { DeepseekController } from './deepseek.controller';
import { DeepseekService } from './deepseek.service';
import { HttpModule } from '@nestjs/axios';
import { Agent } from 'https';

@Module({
  imports: [
    HttpModule.register({
      httpsAgent: new Agent({
        requestCert: true,
        rejectUnauthorized: true
      }),
    })
  ],
  controllers: [DeepseekController],
  providers: [DeepseekService]
})
export class DeepseekModule {}
