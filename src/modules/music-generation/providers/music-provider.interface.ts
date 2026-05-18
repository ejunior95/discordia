export interface MusicClip {
  id: string;
  audioUrl: string;
  imageUrl?: string;
  title?: string;
  durationSec?: number;
}

export type MusicTaskStatus =
  | 'pending'
  | 'running'
  | 'success'
  | 'failure'
  | 'timeout';

export interface MusicTaskStatusResult {
  status: MusicTaskStatus;
  clips?: MusicClip[];
  error?: string;
}

export interface CreateMusicTaskParams {
  lyrics: string;
  tags: string;
  negativeTags?: string;
  title: string;
}

export interface CreateMusicTaskResult {
  taskId: string;
  creditsCharged?: number;
}

export interface IMusicGenerationProvider {
  createTask(params: CreateMusicTaskParams): Promise<CreateMusicTaskResult>;
  getTaskStatus(taskId: string): Promise<MusicTaskStatusResult>;
}

export const MUSIC_PROVIDER_TOKEN = Symbol('IMusicGenerationProvider');
