export type CharacterVoiceGender = 'female' | 'male';

export interface CharacterVoice {
  gender: CharacterVoiceGender;
  id: string;
}

export const CHARACTER_VOICE_POOL: readonly CharacterVoice[] = [
  { gender: 'female', id: 'oi8rgjIfLgJRsQ6rbZh3' },
  { gender: 'male', id: 'aU2vcrnwi348Gnc2Y1si' },
  { gender: 'male', id: '4r3G9XKliGgVZLKMgjik' },
  { gender: 'male', id: 'IKpiSijWzlhOL6uX83EH' },
  { gender: 'female', id: 'ORgG8rwdAiMYRug8RJwR' },
  { gender: 'female', id: 'KHmfNHtEjHhLK9eER20w' },
] as const;

export function randomCharacterVoiceGender(): CharacterVoiceGender {
  return Math.random() < 0.5 ? 'female' : 'male';
}

export function pickCharacterVoice(
  gender: CharacterVoiceGender,
  usedVoiceIds: Iterable<string | undefined | null> = [],
): CharacterVoice {
  const used = new Set(
    Array.from(usedVoiceIds).filter(
      (voiceId): voiceId is string => typeof voiceId === 'string' && !!voiceId,
    ),
  );

  const unusedByGender = CHARACTER_VOICE_POOL.filter(
    (voice) => voice.gender === gender && !used.has(voice.id),
  );
  if (unusedByGender.length > 0) return randomItem(unusedByGender);

  const unused = CHARACTER_VOICE_POOL.filter((voice) => !used.has(voice.id));
  if (unused.length > 0) return randomItem(unused);

  return randomItem(CHARACTER_VOICE_POOL);
}

function randomItem<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}
