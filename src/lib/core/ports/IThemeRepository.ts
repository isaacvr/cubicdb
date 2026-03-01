/**
 * Port for Theme repository operations
 */
export interface IThemeRepository {
  getTheme(name: string): Promise<any | null>;
  getThemes(): Promise<string[]>;
  setActiveTheme(name: string): Promise<void>;
  getActiveTheme(): Promise<string>;
}
