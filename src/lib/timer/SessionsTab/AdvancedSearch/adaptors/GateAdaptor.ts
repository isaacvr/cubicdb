import type { Solve } from "@interfaces";
import type { FieldAdaptor } from "./FieldAdaptor";
import type { LogicBlock } from "./types";

export type GateType = "and" | "or";

export class GateAdaptor implements LogicBlock {
  blocks: (GateAdaptor | FieldAdaptor)[];
  invert: boolean;

  constructor(public type: GateType) {
    this.blocks = [];
    this.invert = false;
  }

  setType(type: GateType) {
    this.type = type;
  }

  computeValue(sv: Solve) {
    const inv = this.invert;

    for (let i = 0, maxi = this.blocks.length; i < maxi; i += 1) {
      const blockValue = this.blocks[i].computeValue(sv);

      if (this.type === "and" && !blockValue) return inv;
      if (this.type === "or" && blockValue) return !inv;
    }

    const a = this.type === "and";

    return !inv ? a : !a;
  }
}
