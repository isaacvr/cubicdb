/**
 * Port for Application configuration
 */
export interface IConfigRepository {
  getValue(key: string): Promise<any>;
  setValue(key: string, value: any): Promise<void>;
  removeValue(key: string): Promise<void>;
  getAll(): Promise<Record<string, any>>;
}
