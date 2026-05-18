import { Module } from '@nestjs/common';
import { ChatGptModule } from '../chat-gpt/chat-gpt.module';
import { DeepseekModule } from '../deepseek/deepseek.module';
import { GeminiModule } from '../gemini/gemini.module';
import { GrokModule } from '../grok/grok.module';
import { OrchestratorGuard } from './orchestrator.guard';
import { OrchestratorService } from './orchestrator.service';

@Module({
  imports: [DeepseekModule, GeminiModule, ChatGptModule, GrokModule],
  providers: [OrchestratorService, OrchestratorGuard],
  exports: [OrchestratorService, OrchestratorGuard],
})
export class OrchestratorModule {}
