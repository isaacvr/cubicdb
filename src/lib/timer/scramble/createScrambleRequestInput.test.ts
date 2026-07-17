import { describe, expect, it } from 'vitest';
import { SCRAMBLE_REQUEST_SOURCES } from '$lib/events/timer/ScrambleEventTypes';
import { createScrambleRequestInput } from './createScrambleRequestInput';

describe('createScrambleRequestInput', () => {
  it('uses selected mode, length, and array probability unchanged', () => {
    expect(createScrambleRequestInput({
      selectedMode: { 0: '3x3', 1: '333', 2: 20 },
      selectedProbability: [1, 4],
      source: SCRAMBLE_REQUEST_SOURCES.USER_REQUESTED,
    })).toEqual({
      mode: '333',
      length: 20,
      probability: [1, 4],
      source: SCRAMBLE_REQUEST_SOURCES.USER_REQUESTED,
    });
  });

  it('uses random-state probability as its generation length', () => {
    expect(createScrambleRequestInput({
      selectedMode: { 0: 'Random state', 1: 'r3', 2: 0 },
      selectedProbability: 5,
      source: SCRAMBLE_REQUEST_SOURCES.SESSION_SCRAMBLE_SETTINGS_CHANGED,
    })).toMatchObject({ mode: 'r3', length: 5, probability: 5 });
  });

  it('applies exact overrides and a provided scramble', () => {
    expect(createScrambleRequestInput({
      selectedMode: { 0: '3x3', 1: '333', 2: 20 },
      selectedProbability: -1,
      modeOverride: '222so',
      lengthOverride: 11,
      probabilityOverride: [2, 3],
      providedScramble: 'R U',
      source: SCRAMBLE_REQUEST_SOURCES.USER_REQUESTED,
    })).toEqual({
      mode: '222so',
      length: 11,
      probability: [2, 3],
      providedScramble: 'R U',
      source: SCRAMBLE_REQUEST_SOURCES.USER_REQUESTED,
    });
  });

  it('rejects empty selected and override modes before publishing a request', () => {
    expect(() => createScrambleRequestInput({
      selectedMode: { 0: 'Pending', 1: '', 2: 20 },
      selectedProbability: -1,
      source: SCRAMBLE_REQUEST_SOURCES.USER_REQUESTED,
    })).toThrow('Scramble mode is required');

    expect(() => createScrambleRequestInput({
      selectedMode: { 0: '3x3', 1: '333', 2: 20 },
      selectedProbability: -1,
      modeOverride: '',
      source: SCRAMBLE_REQUEST_SOURCES.USER_REQUESTED,
    })).toThrow('Scramble mode is required');
  });
});
