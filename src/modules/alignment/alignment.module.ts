import { Module } from '@nestjs/common';
import { ALIGNMENT_PROVIDER_TOKEN } from './alignment-provider.interface';
import { ElevenLabsAlignmentProvider } from './elevenlabs-alignment.provider';

@Module({
  providers: [
    ElevenLabsAlignmentProvider,
    {
      provide: ALIGNMENT_PROVIDER_TOKEN,
      useExisting: ElevenLabsAlignmentProvider,
    },
  ],
  exports: [ALIGNMENT_PROVIDER_TOKEN],
})
export class AlignmentModule {}
