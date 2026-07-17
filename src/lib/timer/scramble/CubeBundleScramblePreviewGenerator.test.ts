import { describe, expect, it, vi } from 'vitest';
import type { Puzzle } from '@classes/puzzle/puzzle';
import { CubeBundleScramblePreviewGenerator } from './CubeBundleScramblePreviewGenerator';

describe('CubeBundleScramblePreviewGenerator', () => {
  it('uses supported CSTimer modes and draws without persistent caching', async () => {
    const cubes = [{ id: 'cube' }] as unknown as Puzzle[];
    const toPuzzle = vi.fn(() => cubes);
    const draw = vi.fn(async () => ['image']);
    const generator = new CubeBundleScramblePreviewGenerator({
      supports: mode => mode === '333',
      toPuzzle,
      draw,
    });

    expect(generator.supports('333')).toBe(true);
    expect(generator.supports('unsupported')).toBe(false);
    await expect(generator.generate('R U', '333')).resolves.toEqual(['image']);
    expect(toPuzzle).toHaveBeenCalledWith('R U', '333');
    expect(draw).toHaveBeenCalledWith(cubes, 500, false, false, false);
  });
});
