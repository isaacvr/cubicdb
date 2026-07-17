import { describe, expect, it } from 'vitest';
import { CubeMode } from '@constants';
import { createImageGenerationConfig } from './createImageGenerationConfig';

describe('createImageGenerationConfig', () => {
  it('derives puzzle, CubeMode, CubeView, and order from the scramble mode options', () => {
    const config = createImageGenerationConfig({
      scramble: 'R U',
      scrambleMode: '333custom',
      getOptions: mode => mode === '333custom'
        ? { type: 'rubik', mode: CubeMode.CROSS, view: 'plan', order: [3, 3, 3] }
        : undefined,
    });

    expect(config).toEqual({
      scramble: 'R U',
      scrambleMode: '333custom',
      puzzle: 'rubik',
      mode: CubeMode.CROSS,
      view: 'plan',
      order: [3, 3, 3],
    });
  });

  it('uses the legacy timer image defaults only when no mode options are available', () => {
    expect(createImageGenerationConfig({
      scramble: 'R U',
      scrambleMode: 'unknown',
      getOptions: () => undefined,
    })).toEqual({
      scramble: 'R U',
      scrambleMode: 'unknown',
      puzzle: 'rubik',
      mode: CubeMode.NORMAL,
      view: 'trans',
      order: [3, 3, 3],
    });
  });
});
