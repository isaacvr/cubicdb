import type { CubicDBAdaptor, CubicDBData } from "@interfaces";

export class CubicDB implements CubicDBAdaptor {
  public modes: string[];

  constructor() {
    this.modes = ["Normal"];
  }

  get name(): string {
    return "CubicDB";
  }

  toCubicDB(str: string): CubicDBData {
    return JSON.parse(str);
  }

  fromCubicDB(data: CubicDBData): string {
    return JSON.stringify(data);
  }
}
