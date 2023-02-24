import { between } from "@helpers/math";
import { Penalty, type CubeDBAdaptor, type CubeDBData, type Session } from "@interfaces";
import moment from "moment";
import { genSettings, identifyPuzzle } from "../common";

const PUZZLE_CODE: Map<string, string> = new Map([
  ["333", "333"],

]);

export class TwistyTimer implements CubeDBAdaptor {
  public modes: string[];

  constructor() {
    this.modes = [ "From backup", "From txt" ];
  }

  get name(): string {
    return "Twisty Timer";
  }

  toCubeDB(str: string, mode?: number): CubeDBData {
    let m = between(mode || 0, 0, this.modes.length - 1);
    if ( m === 0 ) {
      return this.fromBackup(str);
    } else if ( m === 1 ) {
      return this.fromTXT(str);
    }

    return { sessions: [], solves: [] };
  }

  private fromBackup(str: string): CubeDBData {
    let sessionMap: Map<string, string> = new Map();
    let res: CubeDBData = {
      sessions: [],
      solves: [],
    };
    let rows = str.split('\n').slice(1);

    for (let i = 0, maxi = rows.length; i < maxi; i += 1) {
      let parts: string[] = rows[i].trim().split(";");

      if ( parts.length < 7 ) {
        continue;
      }

      let cat: string = parts.shift()?.slice(1, -1) || '';
      let session: string = parts.shift()?.slice(1, -1) || '';
      let time = +(parts.shift()?.slice(1, -1) || 0);
      let date = +(parts.shift()?.slice(1, -1) || 0);
      let scramble: string = parts.shift()?.slice(1, -1) || '';
      let penalty = +(parts.shift()?.slice(1, -1) || 0);
      let comments = parts.join(";").slice(1, -1);

      if ( !sessionMap.has(session) ) {
        sessionMap.set(session, crypto.randomUUID());
        res.sessions.push({
          _id: sessionMap.get(session) || '',
          name: session,
          settings: genSettings(),
        });
      }

      res.solves.push({
        date,
        penalty: [ Penalty.NONE, Penalty.P2, Penalty.DNF ][penalty],
        scramble,
        selected: false,
        session: sessionMap.get(session) || '',
        time,
        _id: crypto.randomUUID(),
        comments,
        mode: PUZZLE_CODE.get(cat),
      });

    }

    return res;
  }

  private fromTXT(str: string): CubeDBData {
    let res: CubeDBData = {
      sessions: [],
      solves: [],
    };
    let rows = str.split('\n');
    let s: Session = {
      _id: crypto.randomUUID(),
      name: "My session",
      settings: genSettings(),
    };

    res.sessions.push( s );

    for (let i = 0, maxi = rows.length; i < maxi; i += 1) {
      let parts = rows[i].trim().split(";");

      if ( parts.length < 3 ) {
        continue;
      }

      let time = +(parts.shift()?.slice(1, -1) || 0) * 1000;
      let scramble: string = parts.shift()?.slice(1, -1) || '';
      let date = moment(parts.shift()?.slice(1, -1)).toDate().getDate();
      let penalty: string = parts.shift() || '';
      let pz = identifyPuzzle(scramble);

      res.solves.push({
        date,
        penalty: /DNF/.test(penalty) ? Penalty.DNF : Penalty.NONE,
        scramble,
        selected: false,
        session: s._id,
        time,
        _id: crypto.randomUUID(),
        comments: "",
        mode: pz.mode,
        len: pz.len,
      });
    }
    
    return res;
  }

  fromCubeDB(data: CubeDBData, mode?: number): string {
    let m = between(mode || 0, 0, this.modes.length - 1);
    if ( m === 0 ) {
      return this.toBackup(data);
    } else if ( m === 1 ) {
      return this.toTXT(data);
    }
    return "";
  }

  private toBackup(data: CubeDBData): string {
    return "<not implemented yet>";
  }

  private toTXT(data: CubeDBData): string {
    return "<not implemented yet>";
  }
}