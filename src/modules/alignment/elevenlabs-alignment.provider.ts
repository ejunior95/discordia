import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import {
  AlignmentResult,
  IAlignmentProvider,
} from './alignment-provider.interface';

/**
 * Provider de forced-alignment usando a API do ElevenLabs.
 * Mais preciso que ASR (Whisper) porque ancora os tempos na letra real
 * gerada pelo LLM antes da música.
 */
@Injectable()
export class ElevenLabsAlignmentProvider implements IAlignmentProvider {
  private readonly logger = new Logger(ElevenLabsAlignmentProvider.name);
  private readonly client: ElevenLabsClient;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('ELEVENLABS_API_KEY');
    if (!apiKey) throw new Error('ELEVENLABS_API_KEY ausente no ambiente');
    this.client = new ElevenLabsClient({ apiKey });
  }

  async align(
    audio: Buffer,
    text: string,
    mimeType: string = 'audio/mpeg',
  ): Promise<AlignmentResult> {
    const cleanText = text.trim();
    if (!cleanText) throw new Error('Texto vazio para alinhamento');

    // SDK aceita Blob via `core.file.Uploadable`.
    const file = new Blob([new Uint8Array(audio)], { type: mimeType });

    try {
      const response = await this.client.forcedAlignment.create({
        file,
        text: cleanText,
      });

      const words = (response.words ?? [])
        .filter((w) => typeof w.text === 'string' && w.text.trim().length > 0)
        .map((w) => ({
          word: w.text,
          start: Number(w.start) || 0,
          end: Number(w.end) || 0,
        }));

      return { words, loss: response.loss };
    } catch (error) {
      this.logger.error(
        `Falha forced-alignment ElevenLabs: ${(error as Error).message}`,
      );
      throw error;
    }
  }
}
