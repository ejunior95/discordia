export interface WordTiming {
  word: string;
  start: number;
  end: number;
}

export interface AlignmentResult {
  words: WordTiming[];
  /** Confidence/loss score do provedor — quanto menor, melhor (ElevenLabs). */
  loss?: number;
}

export interface IAlignmentProvider {
  align(
    audio: Buffer,
    text: string,
    mimeType?: string,
  ): Promise<AlignmentResult>;
}

export const ALIGNMENT_PROVIDER_TOKEN = Symbol('IAlignmentProvider');
