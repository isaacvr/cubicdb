import { Penalty, type CubicDBAdaptor, type CubicDBData } from "@interfaces";
import { genSettings, identifyPuzzle } from "../common";
import { randomUUID } from "@helpers/strings";

interface CSTimerSessionOptions {
  scrType?: string;
}

interface CSTimerSessionProperty {
  date: number[];
  name: string | number;
  opt: CSTimerSessionOptions;
  rank: number;
  stats: number[];
}

export class CSTimer implements CubicDBAdaptor {
  public modes: string[];

  constructor() {
    this.modes = ["Normal"];
  }

  get name(): string {
    return "CSTimer";
  }

  toCubicDB(str: string): CubicDBData {
    const data = JSON.parse(str);
    const sessionNames = Object.keys(data).filter(s => s != "properties");
    const res: CubicDBData = {
      sessions: [],
      solves: [],
    };

    const props = JSON.parse(data.properties.sessionData) as {
      [key: string]: CSTimerSessionProperty;
    };

    for (let i = 0, maxi = sessionNames.length; i < maxi; i += 1) {
      const prop = props[(i + 1).toString()];
      const name = sessionNames[i];
      const sessionName = typeof prop.name === "number" ? name : prop.name.trim();
      const mode = prop.opt.scrType;
      const id = randomUUID();
      const solves = data[name];
      const session = {
        _id: id,
        name: sessionName,
        settings: genSettings(),
      };

      if (prop.opt.scrType) {
        session.settings.sessionType = "single";
        session.settings.mode = prop.opt.scrType;
      }

      res.sessions.push(session);

      for (let j = 0, maxj = solves.length; j < maxj; j += 1) {
        const pz = identifyPuzzle(solves[j][1]);

        res.solves.push({
          date: solves[j][3] * 1000,
          penalty: solves[j][0][0] < 0 ? Penalty.DNF : Penalty.NONE,
          scramble: solves[j][1],
          selected: false,
          session: id,
          time: solves[j][0][1],
          comments: solves[j][2],
          mode: mode || pz.mode,
          len: pz.len,
        });
      }
    }

    return res;
  }

  fromCubicDB(data: CubicDBData): string {
    return "";
  }
}
