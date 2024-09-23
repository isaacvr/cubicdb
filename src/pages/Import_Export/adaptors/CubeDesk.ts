import { Penalty, type CubeDBAdaptor, type CubeDBData } from "@interfaces";
import { genSettings } from "../common";

interface CubeDeskSession {
  id: string;
  name: string;
  created_at: string;
  order: number;
}

interface CubeDeskSolve {
  id: string;
  time: number;
  raw_time: number;
  cube_type: string;
  session_id: string;
  scramble: "";
  dnf: boolean;
  plus_two: boolean;
  started_at: number;
  notes?: string;
}

const MODE_MAP: Map<string, string> = new Map([
  [ "222", "222so" ], [ "222oh", "222so" ],
  [ "333", "333" ], [ "333bl", "333ni" ], [ "333oh", "333oh" ], [ "333mirror", "333" ],
  [ "444", "444wca" ], [ "555", "555wca" ], [ "666", "666wca" ], [ "777", "777wca" ],
  [ "clock", "clkwca" ], [ "skewb", "skbso" ], [ "pyram", "pyrso" ], [ "minx", "mgmp" ],
  [ "sq1", "sqrs" ]
]);

export class CubeDesk implements CubeDBAdaptor {
  public modes: string[];

  constructor() {
    this.modes = [ "Normal" ];
  }

  get name(): string {
    return "CubeDesk";
  }

  toCubeDB(str: string): CubeDBData {
    let { solves, sessions } = JSON.parse(str);
    return {
      sessions: (sessions as CubeDeskSession[]).map(s => ({
        _id: s.id,
        name: s.name,
        settings: genSettings(),
      })),
      solves: (solves as CubeDeskSolve[]).filter(s => s.cube_type != "other").map(s => ({
        date: s.started_at,
        penalty: s.dnf ? Penalty.DNF : s.plus_two ? Penalty.P2 : Penalty.NONE,
        scramble: s.scramble,
        selected: false,
        session: s.session_id,
        time: s.time * 1000,
        comments: s.notes || "",
        mode: MODE_MAP.get(s.cube_type)
      })),
    };
  }

  fromCubeDB(data: CubeDBData): string {
    return "";
  }
}