import { Module } from '@nestjs/common';
import { ElevenLabsService } from './elevenlabs.service';

@Module({
  providers: [ElevenLabsService],
  exports: [ElevenLabsService],
})
export class TtsModule {}
