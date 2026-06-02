import {
  CHARACTER_VOICE_POOL,
  pickCharacterVoice,
  randomCharacterVoiceGender,
} from './voice-pool';

describe('voice-pool', () => {
  it('picks an unused voice matching the requested gender', () => {
    const voice = pickCharacterVoice('female', []);

    expect(voice.gender).toBe('female');
    expect(CHARACTER_VOICE_POOL).toContainEqual(voice);
  });

  it('falls back to any unused voice when the requested gender is exhausted', () => {
    const usedFemaleVoiceIds = CHARACTER_VOICE_POOL.filter(
      (voice) => voice.gender === 'female',
    ).map((voice) => voice.id);

    const voice = pickCharacterVoice('female', usedFemaleVoiceIds);

    expect(voice.gender).toBe('male');
    expect(usedFemaleVoiceIds).not.toContain(voice.id);
  });

  it('returns a pool voice even when every voice has already been used', () => {
    const usedVoiceIds = CHARACTER_VOICE_POOL.map((voice) => voice.id);

    const voice = pickCharacterVoice('male', usedVoiceIds);

    expect(CHARACTER_VOICE_POOL).toContainEqual(voice);
  });

  it('returns a supported random gender', () => {
    expect(['female', 'male']).toContain(randomCharacterVoiceGender());
  });
});
