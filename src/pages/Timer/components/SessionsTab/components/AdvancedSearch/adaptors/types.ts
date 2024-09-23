import type { Solve } from "@interfaces";

export interface LogicBlock {
  computeValue: (sv: Solve) => boolean;
}

export interface NormalFilter {
  field: keyof Solve;
  name: string;
  type: "string" | "number" | "date";
}

export interface MapFilter {
  field: keyof Solve;
  name: string;
  type: "map";
  fn: (val: any) => string;
}

export type FILTER_OPERATOR =
  | "number_equal"
  | "number_nequal"
  | "number_gt"
  | "number_gte"
  | "number_lt"
  | "number_lte"
  | "number_between"
  | "number_nbetween"
  | "string_equal"
  | "string_nequal"
  | "string_contain"
  | "string_starts"
  | "string_ends"
  | "date_equal"
  | "date_after"
  | "date_after_eq"
  | "date_before"
  | "date_before_eq";

export interface InternalFilter {
  code: FILTER_OPERATOR;
  type: SearchFilter["type"];
  fn: (val: any, cmp: any, ...cmp1: any[]) => boolean;
}

export type SearchFilter = NormalFilter | MapFilter;
export type Filter = { field: SearchFilter; filter: InternalFilter; params: any };
