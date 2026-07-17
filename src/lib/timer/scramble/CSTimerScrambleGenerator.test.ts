import { describe, expect, it, vi } from 'vitest';
import { CSTimerScrambleGenerator } from './CSTimerScrambleGenerator';
import { normalizeScramble } from './normalizeScramble';

describe('CSTimerScrambleGenerator', () => {
  it('recognizes a registered default CSTimer mode', () => {
    expect(new CSTimerScrambleGenerator().supports('333')).toBe(true);
  });

  it('reports support from the CSTimer registry and forwards a selected probability', () => {
    const generate = vi.fn(() => 'R U');
    const adapter = new CSTimerScrambleGenerator({
      generate,
      supports: mode => mode === '333',
      selectProbability: values => values[1] ?? -1,
    });

    expect(adapter.supports('333')).toBe(true);
    expect(adapter.supports('unsupported')).toBe(false);
    expect(adapter.generate({ mode: '333', length: 20, probability: [2, 7] })).toBe('R U');
    expect(generate).toHaveBeenCalledWith('333', 20, 7);
  });

  it('normalizes NNN notation using the legacy parser and prettifier sequence', () => {
    expect(normalizeScramble("R  U2  R'", '333')).toBe("R U2 R'");
    expect(normalizeScramble('  /  (3, 0)  ', 'sqrs')).toBe('/  (3, 0)');
  });
});
