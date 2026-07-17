import type { ImageGenerationConfig } from '$lib/events/generation';

export interface IImageGenerator {
  supports(config: ImageGenerationConfig): boolean;
  generate(config: ImageGenerationConfig): Promise<string[]>;
}
