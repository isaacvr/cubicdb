import { between } from "@helpers/math";
import { Penalty, type CubicDBAdaptor, type CubicDBData, type Session } from "@interfaces";
import moment from "moment";
import { genSettings, identifyPuzzle } from "../common";
import { randomUUID } from "@helpers/strings";

const PUZZLE_CODE: Map<string, string> = new Map([
  ["333", "333"],
  ["222", "222so"],
  ["444", "444wca"],
  ["555", "555wca"],
  ["666", "666wca"],
  ["777", "777wca"],
  ["clock", "clkwca"],
  ["mega", "mgmp"],
  ["pyra", "pyrso"],
  ["skewb", "skbso"],
  ["sq1", "sqrs"],
]);

export class TwistyTimer implements CubicDBAdaptor {
  public modes: string[];

  constructor() {
    this.modes = ["From backup", "From txt"];
  }

  get name(): string {
    return "Twisty Timer";
  }

  toCubicDB(str: string, mode?: number): CubicDBData {
    const m = between(mode || 0, 0, this.modes.length - 1);
    if (m === 0) {
      return this.fromBackup(str);
    } else if (m === 1) {
      return this.fromTXT(str);
    }

    return { sessions: [], solves: [] };
  }

  private fromBackup(str: string): CubicDBData {
    const sessionMap: Map<string, string> = new Map();
    const res: CubicDBData = {
      sessions: [],
      solves: [],
    };
    const rows = str.split("\n").slice(1);

    for (let i = 0, maxi = rows.length; i < maxi; i += 1) {
      const parts: string[] = rows[i].trim().split(";");

      if (parts.length < 7) {
        continue;
      }

      const cat: string = parts.shift()?.slice(1, -1) || "";
      const session: string = cat + "_" + (parts.shift()?.slice(1, -1) || "");
      const time = +(parts.shift()?.slice(1, -1) || 0);
      const date = +(parts.shift()?.slice(1, -1) || 0);
      const scramble: string = parts.shift()?.slice(1, -1) || "";
      const penalty = +(parts.shift()?.slice(1, -1) || 0);
      const comments = parts.join(";").slice(1, -1);

      if (!sessionMap.has(session)) {
        sessionMap.set(session, randomUUID());
        res.sessions.push({
          _id: sessionMap.get(session) || "",
          name: session,
          settings: genSettings(),
        });
      }

      res.solves.push({
        date,
        penalty: [Penalty.NONE, Penalty.P2, Penalty.DNF][penalty],
        scramble,
        selected: false,
        session: sessionMap.get(session) || "",
        time,
        _id: randomUUID(),
        comments,
        mode: PUZZLE_CODE.get(cat),
      });
    }

    return res;
  }

  private fromTXT(str: string): CubicDBData {
    const res: CubicDBData = {
      sessions: [],
      solves: [],
    };
    const rows = str.split("\n");
    const s: Session = {
      _id: randomUUID(),
      name: "My session",
      settings: genSettings(),
    };

    res.sessions.push(s);

    for (let i = 0, maxi = rows.length; i < maxi; i += 1) {
      const parts = rows[i].trim().split(";");

      if (parts.length < 3) {
        continue;
      }

      const time = +(parts.shift()?.slice(1, -1) || 0) * 1000;
      const scramble: string = parts.shift()?.slice(1, -1) || "";
      const date = moment(parts.shift()?.slice(1, -1))
        .toDate()
        .getTime();
      const penalty: string = parts.shift() || "";
      const pz = identifyPuzzle(scramble);

      if (s.name == "My session") {
        console.log("PZ: ", pz);
        s.name = pz.name + "-" + Math.random().toString().slice(-4);
      }

      res.solves.push({
        date,
        penalty: /DNF/.test(penalty) ? Penalty.DNF : Penalty.NONE,
        scramble,
        selected: false,
        session: s._id,
        time,
        _id: randomUUID(),
        comments: "",
        mode: pz.mode,
        len: pz.len,
      });
    }

    return res;
  }

  fromCubicDB(data: CubicDBData, mode?: number): string {
    const m = between(mode || 0, 0, this.modes.length - 1);
    if (m === 0) {
      return this.toBackup(data);
    } else if (m === 1) {
      return this.toTXT(data);
    }
    return "";
  }

  private toBackup(data: CubicDBData): string {
    return "<not implemented yet>";
  }

  private toTXT(data: CubicDBData): string {
    return "<not implemented yet>";
  }
}
