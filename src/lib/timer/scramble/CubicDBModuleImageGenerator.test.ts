import { describe, expect, it, vi } from 'vitest';
import { CubeMode } from '@constants';
import { CubicDBModuleImageGenerator } from './CubicDBModuleImageGenerator';

describe('CubicDBModuleImageGenerator', () => {
  it('generates images with cubicdb-module using the source scramble mode', async () => {
    const genImages = vi.fn(() => ['<svg />']);
    const generator = new CubicDBModuleImageGenerator({ genImages });

    await expect(generator.generate({
      scramble: "R U R'",
      scrambleMode: '333',
      puzzle: 'rubik',
      mode: CubeMode.NORMAL,
      view: 'bird',
      order: [3, 3, 3],
    })).resolves.toEqual(['<svg />']);

    expect(genImages).toHaveBeenCalledWith([{ scramble: "R U R'", type: '333' }]);
  });

  it('falls back to puzzle order when the request has no source scramble mode', async () => {
    const genImages = vi.fn(() => ['<svg />']);
    const generator = new CubicDBModuleImageGenerator({ genImages });

    await generator.generate({
      scramble: 'R U',
      puzzle: 'rubik',
      mode: CubeMode.NORMAL,
      view: 'trans',
      order: [4, 4, 4],
    });

    expect(genImages).toHaveBeenCalledWith([{ scramble: 'R U', type: '444' }]);
  });

  it('keeps support broad because unsupported module types fail through service retries', () => {
    const generator = new CubicDBModuleImageGenerator({ genImages: () => [] });

    expect(generator.supports({
      scramble: 'R U',
      puzzle: 'rubik',
      mode: CubeMode.PLL,
      view: 'plan',
      order: [3, 3, 3],
    })).toBe(true);
  });
});
