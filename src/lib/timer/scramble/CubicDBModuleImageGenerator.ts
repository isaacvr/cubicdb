import { genImages as defaultGenImages } from 'cubicdb-module';
import type { ImageGenerationConfig } from '$lib/events/generation';
import type { PuzzleType } from '@interfaces';
import type { IImageGenerator } from './IImageGenerator';

interface CubicDBModuleImageGeneratorDependencies {
  genImages(options: { scramble: string; type: string }[]): string[];
}

const DEFAULT_DEPENDENCIES: CubicDBModuleImageGeneratorDependencies = {
  genImages: defaultGenImages as CubicDBModuleImageGeneratorDependencies['genImages'],
};

function orderToNumber(order: number | number[] | undefined): number {
  if (Array.isArray(order)) return order[0] ?? 3;
  return order ?? 3;
}

function resolveImageScrambler(config: ImageGenerationConfig): string {
  if (config.scrambleMode) return config.scrambleMode;
  if (config.puzzle === 'rubik' || config.puzzle === 'icarry') {
    const order = orderToNumber(config.order);
    return `${order}${order}${order}`;
  }
  return config.puzzle as PuzzleType;
}

export class CubicDBModuleImageGenerator implements IImageGenerator {
  constructor(
    private readonly dependencies: CubicDBModuleImageGeneratorDependencies = DEFAULT_DEPENDENCIES,
  ) {}

  supports(): boolean {
    return true;
  }

  async generate(config: ImageGenerationConfig): Promise<string[]> {
    return this.dependencies.genImages([{
      scramble: config.scramble,
      type: resolveImageScrambler(config),
    }]);
  }
}
