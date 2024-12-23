import type { InternalFilter, LogicBlock, SearchFilter } from "./types";
import moment from "moment";
import { isBetween } from "@helpers/math";
import type { Solve } from "@interfaces";

const NUMBER_FILTER: InternalFilter[] = [
  { type: "number", code: "number_equal", fn: (n: number, m: number) => n === m },
  { type: "number", code: "number_nequal", fn: (n: number, m: number) => n !== m },
  { type: "number", code: "number_gt", fn: (n: number, m: number) => n > m },
  { type: "number", code: "number_gte", fn: (n: number, m: number) => n >= m },
  { type: "number", code: "number_lt", fn: (n: number, m: number) => n < m },
  { type: "number", code: "number_lte", fn: (n: number, m: number) => n <= m },
  {
    type: "number",
    code: "number_between",
    fn: (n: number, a: number, b: number) => isBetween(n, a, b),
  },
  {
    type: "number",
    code: "number_nbetween",
    fn: (n: number, a: number, b: number) => !isBetween(n, a, b),
  },
];

const STRING_FILTER: InternalFilter[] = [
  { type: "string", code: "string_equal", fn: (n: string, m: string) => n === m },
  { type: "string", code: "string_nequal", fn: (n: string, m: string) => n !== m },
  { type: "string", code: "string_contain", fn: (n: string, m: string) => n.includes(m) },
  { type: "string", code: "string_starts", fn: (n: string, m: string) => n.startsWith(m) },
  { type: "string", code: "string_ends", fn: (n: string, m: string) => n.endsWith(m) },
];

const DATE_FORMAT = "YYYY-MM-DD";

const DATE_FILTER: InternalFilter[] = [
  {
    type: "date",
    code: "date_equal",
    fn: (n: number, m: string) => moment(n).isSame(moment(m, DATE_FORMAT), "days"),
  },
  {
    type: "date",
    code: "date_after",
    fn: (n: number, m: string) => moment(n).isAfter(moment(m, DATE_FORMAT), "days"),
  },
  {
    type: "date",
    code: "date_after_eq",
    fn: (n: number, m: string) => moment(n).isSameOrAfter(moment(m, DATE_FORMAT), "days"),
  },
  {
    type: "date",
    code: "date_before",
    fn: (n: number, m: string) => moment(n).isBefore(moment(m, DATE_FORMAT), "days"),
  },
  {
    type: "date",
    code: "date_before_eq",
    fn: (n: number, m: string) => moment(n).isSameOrBefore(moment(m, DATE_FORMAT), "days"),
  },
];

function getFilter(type: SearchFilter["type"]) {
  if (!type) return [];

  if (type === "date") {
    return DATE_FILTER;
  } else if (type === "string") {
    return STRING_FILTER;
  } else if (type === "map") {
    return STRING_FILTER;
  }

  return NUMBER_FILTER;
}

export class FieldAdaptor implements LogicBlock {
  // field: SearchFilter;
  private _filter: InternalFilter;
  filters: InternalFilter[];
  params: any[];

  constructor(public field: SearchFilter) {
    this.filters = getFilter(field.type);
    this._filter = this.filters[0];
    this.params = [];
    this.updateParams();
  }

  get filter() {
    return this._filter;
  }

  private updateParams() {
    const p = " ".repeat(this._filter.fn.length).split(" ").slice(2);

    if (this.params.length < p.length) {
      this.params = [...this.params, ...p.slice(this.params.length)];
    } else {
      this.params = this.params.slice(0, p.length);
    }
  }

  setField(field: SearchFilter) {
    this.field = field;
    this.filters = getFilter(field.type);
    this._filter = this.filters[0];
    this.updateParams();
  }

  setFilter(f: InternalFilter) {
    this._filter = f;
    this.updateParams();
  }

  computeValue(sv: Solve) {
    let value = sv[this.field.field];

    if (this.field.type === "map") {
      value = this.field.fn(value);
    }

    return this._filter.fn(value, this.params[0], ...this.params.slice(1));
  }
}
