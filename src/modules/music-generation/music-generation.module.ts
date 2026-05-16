import { Module } from '@nestjs/common';
import { MusicGenerationController } from './music-generation.controller';
import { MusicGenerationService } from './music-generation.service';
import { SunorProvider } from './providers/sunor.provider';
import { MUSIC_PROVIDER_TOKEN } from './providers/music-provider.interface';

@Module({
  controllers: [MusicGenerationController],
  providers: [
    MusicGenerationService,
    SunorProvider,
    {
      provide: MUSIC_PROVIDER_TOKEN,
      useExisting: SunorProvider,
    },
  ],
  exports: [MusicGenerationService],
})
export class MusicGenerationModule {}
