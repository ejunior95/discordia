import { Module } from '@nestjs/common';
import { GrokController } from './grok.controller';
import { GrokService } from './grok.service';

@Module({
  controllers: [GrokController],
  providers: [GrokService],
  exports: [GrokService],
})
export class GrokModule {}
