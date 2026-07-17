export interface IScramblePreviewGenerator {
  supports(mode: string): boolean;
  generate(scramble: string, mode: string): Promise<string[]>;
}
