import { Penalty } from "@interfaces";

export class Solve {
  _id?: any;
  time: number;
  date: number;
  scramble: string;
  penalty: Penalty;
  session: string;
  comments?: string;
  group?: number;
  mode?: string;
  len?: number;
  prob?: number | number[];
  steps?: number[];
  selected: boolean;

  constructor({
    _id = '',
    time = 0,
    date = Date.now(),
    scramble = '',
    penalty = Penalty.NONE,
    session = '',
    comments = '',
    group,
    mode,
    len,
    prob,
    steps,
    selected = false,
  }: Partial<Solve>) {
    this._id = _id;
    this.time = time;
    this.date = date;
    this.scramble = scramble;
    this.penalty = penalty;
    this.session = session;
    this.comments = comments;
    this.group = group;
    this.mode = mode;
    this.len = len;
    this.prob = prob;
    this.steps = steps;
    this.selected = selected;
  }
}