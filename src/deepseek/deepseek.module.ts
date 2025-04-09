import { Module } from '@nestjs/common';
import { DeepseekController } from './deepseek.controller';
import { DeepseekService } from './deepseek.service';

@Module({
  controllers: [DeepseekController],
  providers: [DeepseekService]
})
export class DeepseekModule {}
