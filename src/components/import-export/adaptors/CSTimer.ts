import { Penalty, type CubeDBAdaptor, type CubeDBData } from "@interfaces";
import { genSettings, identifyPuzzle } from "../common";

export class CSTimer implements CubeDBAdaptor {
  public modes: string[];

  constructor() {
    this.modes = [ "Normal" ];
  }

  get name(): string {
    return "CSTimer";
  }

  toCubeDB(str: string): CubeDBData {
    let data = JSON.parse(str);
    let sessionNames = Object.keys(data).filter(s => s != "properties");
    let res: CubeDBData = {
      sessions: [],
      solves: [],
    };
    
    let props = JSON.parse(data.properties.sessionData);

    for (let i = 0, maxi = sessionNames.length; i < maxi; i += 1) {
      let prop = props[ (i + 1).toString() ];
      let name = sessionNames[i];
      let sessionName = (typeof prop.name === 'number') ? name : prop.name.trim();
      let mode = prop.opt.scrType;
      let id = crypto.randomUUID();
      let solves = data[name];

      res.sessions.push({
        _id: id,
        name: sessionName,
        settings: genSettings(),
      });

      for (let j = 0, maxj = solves.length; j < maxj; j += 1) {
        let pz = identifyPuzzle(solves[j][1]);

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

  fromCubeDB(data: CubeDBData): string {
    return "";
  }
}