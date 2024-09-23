import type { CubeDBAdaptor, CubeDBData } from "@interfaces";

export class CubeDB implements CubeDBAdaptor {
  public modes: string[];

  constructor() {
    this.modes = [ "Normal" ];
  }

  get name(): string {
    return "CubeDB";
  }

  toCubeDB(str: string): CubeDBData {
    return JSON.parse(str);
  }

  fromCubeDB(data: CubeDBData): string {
    return JSON.stringify(data);
  }
}