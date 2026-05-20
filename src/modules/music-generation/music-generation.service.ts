import { Inject, Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { v4 as uuid } from 'uuid';
import { HistoryService } from 'src/shared/history.service';
import { S3Service } from 'src/shared/s3.service';
import {
  IMusicGenerationProvider,
  MUSIC_PROVIDER_TOKEN,
} from './providers/music-provider.interface';
import {
  ALIGNMENT_PROVIDER_TOKEN,
  IAlignmentProvider,
  WordTiming,
} from '../alignment/alignment-provider.interface';

const RAP_TAGS = 'rap battle, hip-hop, beat';
const RAP_NEGATIVE_TAGS = 'english vocals, instrumental';

export type VoiceGender = 'male' | 'female';

function buildVoiceTags(voiceGender?: VoiceGender): {
  tags: string;
  negativeTags: string;
} {
  if (voiceGender === 'female') {
    return {
      tags: `${RAP_TAGS}, female vocals`,
      negativeTags: `${RAP_NEGATIVE_TAGS}, male vocals`,
    };
  }
  if (voiceGender === 'male') {
    return {
      tags: `${RAP_TAGS}, male vocals`,
      negativeTags: `${RAP_NEGATIVE_TAGS}, female vocals`,
    };
  }
  return { tags: RAP_TAGS, negativeTags: RAP_NEGATIVE_TAGS };
}

export interface RapTaskAttachResult {
  musicTaskId?: string;
  musicStatus: 'pending' | 'failed';
  creditsCharged?: number;
  musicError?: string;
}

export interface PollResult {
  status: 'ready' | 'processing' | 'failed';
  audio_url?: string;
  error?: string;
  lyricsTimings?: WordTiming[];
  karaokeStatus?: 'pending' | 'ready' | 'failed';
}

function ensureStructureTag(lyrics: string): string {
  const trimmed = lyrics.trim();
  if (/\[(Verse|Chorus|Intro|Outro|Bridge|Hook)/i.test(trimmed)) return trimmed;
  return `[Verse]\n${trimmed}`;
}

/**
 * Remove tags estruturais como [Verse], [Chorus], [Intro], etc. e linhas vazias
 * para enviar à API de forced-alignment apenas as palavras realmente cantadas.
 */
function sanitizeLyricsForAlignment(lyrics: string): string {
  return lyrics
    .replace(/\[(Verse|Chorus|Intro|Outro|Bridge|Hook)[^\]]*\]/gi, '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .join('\n');
}

@Injectable()
export class MusicGenerationService {
  private readonly logger = new Logger(MusicGenerationService.name);

  constructor(
    @Inject(MUSIC_PROVIDER_TOKEN)
    private readonly provider: IMusicGenerationProvider,
    private readonly historyService: HistoryService,
    private readonly s3Service: S3Service,
    @Inject(ALIGNMENT_PROVIDER_TOKEN)
    private readonly alignmentProvider: IAlignmentProvider,
  ) {}

  async createRapVerseTask(
    historyId: string,
    lyrics: string,
    theme: string,
    _userId: string,
    voiceGender?: VoiceGender,
  ): Promise<RapTaskAttachResult> {
    try {
      const prompt = ensureStructureTag(lyrics);
      const title = `Rap Battle${theme ? ` - ${theme.slice(0, 60)}` : ''}`;
      const { tags, negativeTags } = buildVoiceTags(voiceGender);

      const { taskId, creditsCharged } = await this.provider.createTask({
        lyrics: prompt,
        tags,
        negativeTags,
        title,
      });

      await this.historyService.attachAudioMeta(historyId, {
        provider: 'sunor',
        status: 'pending',
        taskId,
      });

      return {
        musicTaskId: taskId,
        musicStatus: 'pending',
        creditsCharged,
      };
    } catch (error) {
      const message = (error as Error).message;
      this.logger.error(`Falha ao criar task Sunor: ${message}`);
      try {
        await this.historyService.attachAudioMeta(historyId, {
          provider: 'sunor',
          status: 'failed',
          error: message,
        });
      } catch (persistError) {
        this.logger.error(
          `Falha ao registrar erro Sunor: ${(persistError as Error).message}`,
        );
      }
      return { musicStatus: 'failed', musicError: message };
    }
  }

  async pollAndFinalize(taskId: string, userId: string): Promise<PollResult> {
    const existing = await this.historyService.findByTaskId(taskId);
    if (!existing) {
      return {
        status: 'failed',
        error: 'Task não encontrada para este usuário',
      };
    }
    if (existing.user_id !== userId) {
      return { status: 'failed', error: 'Task não pertence ao usuário' };
    }
    if (existing.audio_url) {
      return {
        status: 'ready',
        audio_url: existing.audio_url,
        lyricsTimings: existing.audio_meta?.lyricsTimings,
        karaokeStatus: existing.audio_meta?.karaokeStatus,
      };
    }
    if (existing.audio_meta?.status === 'failed') {
      return {
        status: 'failed',
        error: existing.audio_meta.error ?? 'Falha anterior',
      };
    }

    let remote;
    try {
      remote = await this.provider.getTaskStatus(taskId);
    } catch (error) {
      this.logger.error(
        `Falha consulta Sunor ${taskId}: ${(error as Error).message}`,
      );
      return { status: 'processing' };
    }

    if (remote.status === 'pending' || remote.status === 'running') {
      return { status: 'processing' };
    }

    if (remote.status === 'failure' || remote.status === 'timeout') {
      await this.historyService.attachAudioMeta(existing._id.toString(), {
        ...(existing.audio_meta ?? { provider: 'sunor', taskId }),
        status: 'failed',
        error: remote.error,
      });
      return { status: 'failed', error: remote.error };
    }

    // success
    const randomSelectClip = remote.clips?.[Math.floor(Math.random() * remote.clips.length)];
    const clip = randomSelectClip ?? remote.clips?.[0];
    if (!clip?.audioUrl) {
      await this.historyService.attachAudioMeta(existing._id.toString(), {
        ...(existing.audio_meta ?? { provider: 'sunor', taskId }),
        status: 'failed',
        error: 'Sem clipe retornado',
      });
      return { status: 'failed', error: 'Sem clipe retornado' };
    }

    try {
      const response = await axios.get<ArrayBuffer>(clip.audioUrl, {
        responseType: 'arraybuffer',
        timeout: 60000,
      });
      const buffer = Buffer.from(response.data);
      const key = `rap-audio/${userId}/${uuid()}.mp3`;
      const audioUrl = await this.s3Service.uploadBuffer(
        buffer,
        key,
        'audio/mpeg',
      );

      await this.historyService.setAudioUrl(existing._id.toString(), audioUrl, {
        provider: 'sunor',
        status: 'ready',
        taskId,
        clipId: clip.id,
        durationSec: clip.durationSec,
        model: 'suno-v5.5',
        karaokeStatus: 'pending',
      });

      // Forced-alignment (karaokê). Falhar aqui NÃO invalida o áudio.
      let lyricsTimings: WordTiming[] = [];
      let karaokeStatus: 'ready' | 'failed' = 'failed';
      try {
        const cleanLyrics = sanitizeLyricsForAlignment(existing.content ?? '');
        if (cleanLyrics.length > 0) {
          const aligned = await this.alignmentProvider.align(
            buffer,
            cleanLyrics,
            'audio/mpeg',
          );
          lyricsTimings = aligned.words;
          karaokeStatus = lyricsTimings.length > 0 ? 'ready' : 'failed';
        }
      } catch (alignErr) {
        this.logger.warn(
          `Forced-alignment falhou para taskId=${taskId}: ${(alignErr as Error).message}`,
        );
        karaokeStatus = 'failed';
      }

      try {
        await this.historyService.setLyricsTimings(
          existing._id.toString(),
          lyricsTimings,
          karaokeStatus,
        );
      } catch (persistErr) {
        this.logger.error(
          `Falha ao persistir timings: ${(persistErr as Error).message}`,
        );
      }

      return {
        status: 'ready',
        audio_url: audioUrl,
        lyricsTimings: karaokeStatus === 'ready' ? lyricsTimings : undefined,
        karaokeStatus,
      };
    } catch (error) {
      const message = (error as Error).message;
      this.logger.error(`Falha download/upload áudio Sunor: ${message}`);
      await this.historyService.attachAudioMeta(existing._id.toString(), {
        ...(existing.audio_meta ?? { provider: 'sunor', taskId }),
        status: 'failed',
        error: message,
      });
      return { status: 'failed', error: message };
    }
  }
}
