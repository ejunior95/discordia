import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import {
  CreateMusicTaskParams,
  CreateMusicTaskResult,
  IMusicGenerationProvider,
  MusicClip,
  MusicTaskStatus,
  MusicTaskStatusResult,
} from './music-provider.interface';

interface SunorCreateResponse {
  task_id?: string;
  taskId?: string;
  credits_charged?: number;
  data?: { task_id?: string; taskId?: string; credits_charged?: number };
}

interface SunorClip {
  id?: string;
  audio_url?: string;
  image_url?: string;
  title?: string;
  metadata?: { duration?: number; tags?: string };
}

interface SunorStatusResponse {
  status?: string;
  error?: string;
  data?: {
    status?: string;
    error?: string;
    output?: {
      result?: SunorClip[];
      fail_reason?: string;
    };
  };
  output?: {
    result?: SunorClip[];
    fail_reason?: string;
  };
}

function mapStatus(raw: string | undefined): MusicTaskStatus {
  switch (raw) {
    case 'success':
    case 'completed':
      return 'success';
    case 'failure':
    case 'failed':
      return 'failure';
    case 'timeout':
      return 'timeout';
    case 'running':
    case 'processing':
      return 'running';
    case 'pending':
    case 'queued':
    default:
      return 'pending';
  }
}

@Injectable()
export class SunorProvider implements IMusicGenerationProvider {
  private readonly logger = new Logger(SunorProvider.name);
  private readonly http: AxiosInstance;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('SUNOR_API_KEY');
    const baseURL =
      this.configService.get<string>('SUNOR_API_BASE_URL') ??
      'https://sunor.cc/api/v1';

    if (!apiKey) throw new Error('SUNOR_API_KEY ausente no ambiente');

    this.http = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
    });
  }

  async createTask(
    params: CreateMusicTaskParams,
  ): Promise<CreateMusicTaskResult> {
    const body = {
      model: 'suno',
      task_type: 'music',
      input: {
        prompt: params.lyrics,
        tags: params.tags,
        negative_tags: params.negativeTags ?? '',
        title: params.title,
      },
    };

    const { data } = await this.http.post<SunorCreateResponse>('/task', body);
    const taskId =
      data?.task_id ??
      data?.taskId ??
      data?.data?.task_id ??
      data?.data?.taskId;

    if (!taskId) {
      this.logger.error(
        `Sunor createTask sem task_id: ${JSON.stringify(data)}`,
      );
      throw new Error('Sunor não retornou task_id');
    }

    return {
      taskId,
      creditsCharged: data?.credits_charged ?? data?.data?.credits_charged,
    };
  }

  async getTaskStatus(taskId: string): Promise<MusicTaskStatusResult> {
    const { data } = await this.http.get<SunorStatusResponse>(
      `/task/${taskId}`,
    );

    const inner = data?.data ?? data;
    const status = mapStatus(inner?.status ?? data?.status);
    const output = inner?.output ?? data?.output;

    if (status === 'success') {
      const clips: MusicClip[] = (output?.result ?? []).map((clip) => ({
        id: clip.id ?? '',
        audioUrl: clip.audio_url ?? '',
        imageUrl: clip.image_url,
        title: clip.title,
        durationSec: clip.metadata?.duration,
      }));
      return { status, clips };
    }

    if (status === 'failure' || status === 'timeout') {
      return {
        status,
        error:
          output?.fail_reason ??
          inner?.error ??
          data?.error ??
          'Erro desconhecido',
      };
    }

    return { status };
  }
}
