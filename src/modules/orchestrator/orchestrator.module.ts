import { Module } from '@nestjs/common';
import { MinimaxModule } from '../minimax/minimax.module';
import { OrchestratorGuard } from './orchestrator.guard';
import { OrchestratorService } from './orchestrator.service';

@Module({
  imports: [MinimaxModule],
  providers: [OrchestratorService, OrchestratorGuard],
  exports: [OrchestratorService, OrchestratorGuard],
})
export class OrchestratorModule {}