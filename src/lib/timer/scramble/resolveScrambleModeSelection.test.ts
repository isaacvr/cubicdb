import { describe, expect, it } from 'vitest';
import { resolveScrambleModeSelection } from './resolveScrambleModeSelection';

describe('resolveScrambleModeSelection', () => {
  const menu = [
    ['WCA', [['3x3', '333', 20], ['2x2', '222so', 9]]],
    ['Training', [['OLL', '333oll', 0]]],
  ] as any;

  it('keeps the current selected mode when it has a concrete scramble code', () => {
    expect(resolveScrambleModeSelection({
      selectedMode: { 0: '2x2', 1: '222so', 2: 9 },
      selectedGroup: 0,
      menu,
    })).toEqual({ 0: '2x2', 1: '222so', 2: 9 });
  });

  it('falls back to the selected group first mode while the current mode store is empty', () => {
    expect(resolveScrambleModeSelection({
      selectedMode: { 0: '', 1: '', 2: 0 },
      selectedGroup: 1,
      menu,
    })).toEqual(['OLL', '333oll', 0]);
  });

  it('falls back to the first group when no selected group exists yet', () => {
    expect(resolveScrambleModeSelection({
      selectedMode: { 0: '', 1: '', 2: 0 },
      selectedGroup: undefined,
      menu,
    })).toEqual(['3x3', '333', 20]);
  });

  it('returns null when neither current mode nor menu can provide a scramble code', () => {
    expect(resolveScrambleModeSelection({
      selectedMode: { 0: '', 1: '', 2: 0 },
      selectedGroup: 0,
      menu: [],
    })).toBeNull();
  });
});
