import { get, writable, type Writable } from "svelte/store";
import {
  Penalty,
  TimerState,
  type BluetoothDeviceData,
  type ITimerController,
  type PuzzleType,
  type Session,
  type Solve,
  type Statistics,
} from "@interfaces";
import { AON, isNNN, type SCRAMBLE_MENU } from "@constants";
import { getUpdatedStatistics, INITIAL_STATISTICS, statsReplaceId } from "@helpers/statistics";
import type { HTMLImgAttributes } from "svelte/elements";
import { devices } from "@stores/devices.store";
import { localLang } from "@stores/language.service";
import { dataService } from "$lib/data-services/data.service";
import { NotificationService } from "@stores/notification.service";
import { adjustMillis, infinitePenalty, timer } from "@helpers/timer";
import JSConfetti from "js-confetti";
import { CreateSolve } from "$lib/core/usecases/CreateSolve";
import { SolveRepositoryAdapter } from "$lib/adapters/SolveRepositoryAdapter";
import { prettyScramble, randomUUID } from "@helpers/strings";
import { between } from "@helpers/math";
import { getScramble, pScramble } from "@cstimer/scramble";
import { rndEl } from "@cstimer/lib/mathlib";
import { ScrambleParser } from "@classes/scramble-parser";
import { scrambleToPuzzle } from "@helpers/scrambleToPuzzle";
import { pGenerateCubeBundle } from "@helpers/cube-draw";
import { createEmptySession } from "@helpers/object";

interface TimerEnv {
  useMode: string;
  useLen: number;
  useProb: number;
  useScramble: string;
  genScramble: boolean;
}

function normalizeSessionId(sessionId: unknown): string | number | undefined {
  if (typeof sessionId === "number") return sessionId;
  if (typeof sessionId === "string" && /^-?\d+$/.test(sessionId)) return Number(sessionId);
  if (typeof sessionId === "string") return sessionId;
  return undefined;
}

export class TimerController implements ITimerController {
  timerState = writable<TimerState>(TimerState.CLEAN);
  ready = writable(false);
  tab = writable(0);
  solves = writable<Solve[]>([]);
  allSolves = writable<Solve[]>([]);
  session = writable<Session>(createEmptySession());
  Ao5 = writable<number[]>();
  stats = writable<Statistics>(INITIAL_STATISTICS);
  scramble = writable("");
  group = writable<number>();
  mode = writable<{ 0: string; 1: string; 2: number }>(["", "", 0]);
  filters = writable<string[]>([]);
  preview = writable<HTMLImgAttributes[]>([]);
  prob = writable<number | number[]>();
  enableKeyboard = writable(true);
  isRunning = writable(false);
  decimals = writable(true);
  bluetoothList = writable<BluetoothDeviceData[]>([]);
  STATS_WINDOW = writable<(number | null)[][]>(get(AON).map(_ => []));
  puzzleType = writable<PuzzleType>("rubik");
  puzzleOrder = writable(3);
  deviceList = writable<string[][]>([]);
  time = writable<number>(0);
  lastSolve: Writable<Solve | null> = writable(null);
  device = writable(get(devices)[0]);
  currentStep = writable(1);
  confetti = new JSConfetti();
  solveRepo = new SolveRepositoryAdapter();
  timerOnly = false;
  scrambleOnly = false;
  battle = false;

  constructor() {}

  private startTime = 0;

  start() {
    this.startTime = performance.now();
    this.timerState.set(TimerState.RUNNING);
  }

  stop() {
    const elapsed = performance.now() - this.startTime;
    this.timerState.set(TimerState.STOPPED);
    this.time.set(elapsed);
    return elapsed;
  }

  reset() {
    this.timerState.set(TimerState.CLEAN);
    this.ready.set(false);
    this.time.set(0);
    this.lastSolve.set(null);
    get(this.device).stopTimer();
  }

  addSolve(t?: number, p?: Penalty) {
    const { group, mode, prob, session, time, lastSolve, allSolves, solves, stats } = this;
    const sv = new CreateSolve(this.solveRepo);

    const solve = sv.execute({
      group: get(group),
      mode: get(mode)[1],
      len: get(mode)[2],
      prob: get(prob),
      session: get(session)._id,
      penalty: p || Penalty.NONE,
      time: adjustMillis(t || get(time), false),
      _id: randomUUID(),
    });

    lastSolve.set(solve);
    allSolves.update(alls => [...alls, solve]);
    solves.update(svs => [...svs, solve]);

    if (this.timerOnly || this.scrambleOnly) return;

    if (this.battle) {
      solve.group = -1;
      // dispatch("solve", $lastSolve);
    } else {
      this.solveRepo.addSolve(solve).then(d => {
        const s = get(allSolves).find(s => s.date === d.date);

        if (s) {
          statsReplaceId(get(stats), s._id, d._id);
          s._id = d._id;
          this.updateSolves();
        }
      });
      this.sortSolves();
      this.updateStatistics(true);
    }
  }

  updateSolves() {
    const { solves, allSolves, session, Ao5 } = this;

    const sessionId = normalizeSessionId((get(session) || {})._id);
    solves.set(get(allSolves).filter(s => normalizeSessionId(s.session) === sessionId));

    // Calc next Ao5
    const arr = get(solves)
      .slice(0, 4)
      .filter(s => !infinitePenalty(s))
      .map(s => s.time);
    const sum = arr.reduce((ac, e) => ac + e, 0);
    arr.sort();

    Ao5.set(arr.length === 4 ? [(sum - arr[3]) / 3, (sum - arr[0]) / 3].sort((a, b) => a - b) : []);
  }

  sortSolves() {
    this.allSolves.update(alls => alls.sort((a, b) => b.date - a.date));
    this.updateSolves();
  }

  selectedSolveById(id: string, n: number): number {
    const { solves, tab } = this;
    let selected = 0;
    const nSolves = get(solves);

    nSolves.forEach(s => (s.selected = false));

    for (let i = 0, maxi = get(solves).length; i < maxi; i += 1) {
      if (nSolves[i]._id === id) {
        for (let j = 0; j < n && i + j < maxi; j += 1) {
          if (nSolves[i + j].selected) continue;

          nSolves[i + j].selected = true;
          selected += 1;
        }

        tab.set(1);
        break;
      }
    }

    solves.set(nSolves);

    return selected;
  }

  async updateStatistics(inc?: boolean) {
    const { stats, solves, session, STATS_WINDOW } = this;
    const lLang = get(localLang);
    const st = getUpdatedStatistics(get(stats), get(solves), get(session), get(AON), inc);
    stats.set(st.stats);
    STATS_WINDOW.set(st.window);

    const bestList = [];

    for (const e of Object.entries(get(stats))) {
      if (e[1].better) {
        bestList.push({
          name: e[0] === "best" ? lLang.TIMER.best : e[0],
          prev: e[1].prev || 0,
          now: e[1].best || 0,
        });
      }
    }

    if (bestList.length && get(session).settings.recordCelebration) {
      get(dataService).emit("new-record");

      const notService = NotificationService.getInstance();

      notService.addNotification({
        header: lLang.TIMER.congrats,
        text: "",
        html: bestList
          .map(o => `${o.name}: ${timer(o.now, true)} (${lLang.TIMER.from} ${timer(o.prev, true)})`)
          .join("<br>"),
        timeout: 5000,
      });

      this.confetti.addConfetti({
        confettiNumber: 100,
        confettiColors: ["#009d54", "#3d81f6", "#ffeb3b"],
      });
    }
  }

  nextTab() {
    this.tab.update(tb => between(tb + 1, 0, 2));
  }

  prevTab() {
    this.tab.update(tb => between(tb - 1, 0, 2));
  }

  initScrambler(
    MENU: SCRAMBLE_MENU[],
    env: TimerEnv,
    scr?: string,
    _mode?: string,
    _prob?: number | number[]
  ) {
    const { mode, group, prob, scramble, session, puzzleType, puzzleOrder } = this;
    const { useMode, useLen, useScramble, useProb, genScramble } = env;
    let sMode = get(mode);

    if (!sMode) {
      mode.set(MENU[get(group) || 0][1][0]);
      sMode = MENU[get(group) || 0][1][0];
    }

    const md = useMode || _mode || get(mode)[1];
    const len =
      useLen || (sMode[1] === "r3" || sMode[1] === "r3ni" ? (get(prob) as number) : sMode[2]);
    const s = useScramble || scr;
    const pb = useProb != -1 ? useProb : _prob != -1 && typeof _prob === "number" ? _prob : get(prob);
    let _scramble = "";

    if (!genScramble) {
      _scramble = scr || useScramble;
    } else {
      _scramble = s ? s : getScramble(md, len, Array.isArray(pb) ? rndEl(pb) : pb);
    }

    if (isNNN(md)) {
      _scramble = ScrambleParser.parseNNNString(_scramble);
    }

    _scramble = prettyScramble(_scramble);

    // emit scramble for iCarry and other stuffs
    // $dataService.scramble(_scramble);

    this.scramble.set(_scramble);

    // $scramble = "U' B2 D L2 B2 D L2 R2 F2 D' F2 B' R' D L' U2 B' D2 B";

    // let cfop = new CFOP(Puzzle.fromSequence($scramble, { type: 'rubik' }).toFacelet());
    // cfop.getAnalysis();

    // console.log("MODE: ", md);

    const opts = pScramble.options.get(md);

    if (opts) {
      if (!Array.isArray(opts)) {
        puzzleType.set(opts.type);
        puzzleOrder.set(opts.order ? opts.order[0] : 3);
      }
    }

    if (opts && get(session)?.settings?.genImage) {
      // console.log("HAS", md);
      this.updateImage(md);
    } else {
      this.setPreview([]);
    }
  }

  setPreview(img: string[]) {
    this.preview.set(img.map(src => ({ src, alt: "", title: "" })));
  }

  async updateImage(md: string) {
    const { scramble, preview } = this;
    const cb = scrambleToPuzzle(get(scramble), md);
    const date = Date.now();

    this.setPreview(await pGenerateCubeBundle(cb, 500));
  }
}
