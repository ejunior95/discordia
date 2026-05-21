import { Module } from '@nestjs/common';
import { MinimaxService } from './minimax.service';

@Module({
  providers: [MinimaxService],
  exports: [MinimaxService],
})
export class MinimaxModule {}