import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

const MAX_CHARS = 1500;

export interface SynthesizeResult {
  buffer: Buffer;
  mimeType: 'audio/mpeg';
  voiceId: string;
  model: string;
}

@Injectable()
export class ElevenLabsService {
  private readonly logger = new Logger(ElevenLabsService.name);
  private readonly client: ElevenLabsClient;
  private readonly defaultVoiceId: string;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('ELEVENLABS_API_KEY');
    const voiceId = this.configService.get<string>(
      'ELEVENLABS_VOICE_ID_NARRATOR_PTBR',
    );
    const model =
      this.configService.get<string>('ELEVENLABS_MODEL') ??
      'eleven_multilingual_v2';

    if (!apiKey) throw new Error('ELEVENLABS_API_KEY ausente no ambiente');
    if (!voiceId)
      throw new Error('ELEVENLABS_VOICE_ID_NARRATOR_PTBR ausente no ambiente');

    this.client = new ElevenLabsClient({ apiKey });
    this.defaultVoiceId = voiceId;
    this.model = model;
  }

  async synthesize(
    text: string,
    opts?: { voiceId?: string; stability?: number; style?: number },
  ): Promise<SynthesizeResult> {
    const sanitized = text.trim();
    if (!sanitized) throw new Error('Texto vazio para TTS');

    const truncated =
      sanitized.length > MAX_CHARS
        ? `${sanitized.slice(0, MAX_CHARS - 3)}...`
        : sanitized;

    const voiceId = opts?.voiceId ?? this.defaultVoiceId;

    try {
      const stream = await this.client.textToSpeech.convert(voiceId, {
        text: truncated,
        modelId: this.model,
        languageCode: 'pt',
        voiceSettings: {
          stability: opts?.stability ?? 0.4,
          style: opts?.style ?? 0.6,
          useSpeakerBoost: true,
        },
      });

      const chunks: Buffer[] = [];
      for await (const chunk of stream as AsyncIterable<Uint8Array>) {
        chunks.push(Buffer.from(chunk));
      }
      const buffer = Buffer.concat(chunks);

      if (buffer.length === 0) {
        throw new Error('Resposta vazia do ElevenLabs');
      }

      return { buffer, mimeType: 'audio/mpeg', voiceId, model: this.model };
    } catch (error) {
      this.logger.error(`Falha TTS ElevenLabs: ${(error as Error).message}`);
      throw new InternalServerErrorException('Falha ao gerar narração');
    }
  }
}
