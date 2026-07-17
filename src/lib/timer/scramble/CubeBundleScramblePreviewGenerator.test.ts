import { describe, expect, it, vi } from 'vitest';
import { CubeMode } from '@constants';
import type { Puzzle } from '@classes/puzzle/puzzle';
import { CubeBundleScramblePreviewGenerator } from './CubeBundleScramblePreviewGenerator';

describe('CubeBundleScramblePreviewGenerator', () => {
  it('uses supported CSTimer modes and draws without persistent caching', async () => {
    const cubes = [{ view: 'trans' }] as unknown as Puzzle[];
    const toPuzzle = vi.fn(() => cubes);
    const draw = vi.fn(async () => ['image']);
    const generator = new CubeBundleScramblePreviewGenerator({
      supports: mode => mode === '333',
      toPuzzle,
      draw,
    });
    const config = {
      scramble: 'R U',
      puzzle: 'rubik' as const,
      mode: CubeMode.NORMAL,
      view: 'bird' as const,
      order: [3, 3, 3],
    };

    expect(generator.supports(config)).toBe(true);
    expect(generator.supports({ ...config, puzzle: 'clock' })).toBe(false);
    await expect(generator.generate(config)).resolves.toEqual(['image']);
    expect(toPuzzle).toHaveBeenCalledWith('R U', '333');
    expect(cubes[0].view).toBe('bird');
    expect(draw).toHaveBeenCalledWith(cubes, 500, false, false, false);
  });
});
