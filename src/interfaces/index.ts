import type { Puzzle } from './../classes/puzzle/puzzle';
import type { Sticker } from './../classes/puzzle/Sticker';
import type { Piece } from './../classes/puzzle/Piece';
import type { Vector3D } from '../classes/vector3d';
import type { CubeMode } from "../constants";
import type { Writable } from 'svelte/store';

export declare type PuzzleType = 'rubik' | 'skewb' | 'square1' | 'pyraminx' | 'axis' | 'fisher' | 'ivy'
  | 'clock' | 'megaminx' | 'mirror' | 'dino' | 'rex' | 'redi' | 'mixup' | 'pyramorphix' | 'gear' | 'dreidel'
  | 'bandaged222' | 'bicube' | 'square2' | 'pandora' | 'ultimateSkewb' | 'pyraminxCrystal' | 'tetraminx'
  | 'meierHalpernPyramid' | 'sq1Star';

export declare type CubeView = 'plan' | 'trans' | '2d';
export const CubeViewMap: [ CubeView, string ][] = [
  [ '2d', '2D' ],
  [ 'plan', 'Plain' ],
  [ 'trans', '3D' ],
];

export function nameToPuzzle(name: string): any[] {
  const reg1 = /^(\d*)[xX](\d*)$/, reg2 = /^(\d*)[xX](\d*)[xX](\d*)$/, reg3 = /^(\d){3}$/;

  let dims;

  if ( reg1.test(name) ) {
    return [ 'rubik', +name.replace(reg1, "$1") ];
  } else if ( reg2.test(name) ) {
    dims = name.replace(reg2, "$1 $2 $3").split(" ").map(Number);
    return [ 'rubik', ...dims ];
  } else if ( reg3.test(name) ) {
    dims = name.split('').map(Number);
    return ['rubik', ...dims];
  }

  switch(name) {
    case 'sq1':
    case 'Square-1': return [ 'square1' ];
    case 'Skewb': return [ 'skewb' ];
    case 'Pyraminx': return [ 'pyraminx' ];
    case 'Axis': return [ 'axis' ];
    case 'Fisher': return [ 'fisher' ];
    case 'Ivy': return [ 'ivy' ];
    default: return [ 'rubik', 3 ];
  }
}

export enum TimerState {
  CLEAN = 0, STOPPED = 1, PREVENTION = 2, INSPECTION = 3, RUNNING = 4
};

export enum AverageSetting {
  SEQUENTIAL = 0,
  GROUP = 1
}

export interface Card {
  title: string;
  cube: string;
  ready: boolean;
  route: string;
  timer?: boolean;
  puzzle?: Puzzle;
}

export interface RawCard {
  title: string;
  scramble: string;
  route: string;
  cubeType: PuzzleType;
  cubeMode: CubeMode;
  order: number[];
  timer: boolean;
  view?: CubeView;
  tips?: number[];
  createdAt?: number;
}

export interface Solution {
  moves: string;
  votes: number;
}

export interface Algorithm {
  _id?: string;
  name: string;
  shortName: string;
  group?: string;
  order: number;
  scramble: string;
  puzzle?: string;
  solutions?: Solution[];
  mode: CubeMode;
  cube ?: string;
  ready: boolean;
  tips ?: number[];
  parentPath ?: string;
  view?: CubeView;
  _puzzle?: Puzzle;
}

export interface AlgorithmTree {
  route: string;
  name: string;
  alg: Algorithm;
  children: AlgorithmTree[];
  expanded?: boolean;
}

export interface NavigationRoute {
  link: string;
  name: string;
}

export interface PuzzleInterface {
  pieces: Piece[];
  palette: any;
  rotation: {
    x?: number;
    y?: number;
    z?: number;
  };
  center: Vector3D;
  faceVectors: Vector3D[];
  faceColors: string[];
  getAllStickers: () => Sticker[];
  move: (m: any) => any;
  roundParams: any[];
  isRounded?: boolean;
  dims?: number[];
  raw?: any;
  scramble?: () => any;
  toMove?: (...args: any) => any;
  vectorsFromCamera?: (...args: any) => any;
}

export interface PuzzleOptions {
  type: PuzzleType;
  order?: number[];
  mode?: CubeMode;
  view?: CubeView;
  tips?: number[];
  headless?: boolean;
  sequence?: string; // This field has no effects in the constructor
  rounded?: boolean;
}

export enum Penalty {
  NONE = 0, P2 = 1, DNF = 2, DNS = 3
}

export interface Solve {
  _id?: any;
  time: number;
  date: number;
  scramble: string;
  penalty: Penalty;
  selected: boolean;
  session: string;
  comments?: string;
  group?: number;
  mode?: string;
  len?: number;
  prob?: number;
}

export type TimerInput = 'Keyboard' | 'Manual' | 'StackMat';

export const TIMER_INPUT: TimerInput[] = [ 'Keyboard', 'Manual', 'StackMat' ];

export interface SessionSettings {
  hasInspection: boolean;
  inspection: number;
  showElapsedTime: boolean;
  calcAoX: AverageSetting;
  genImage: boolean;
  scrambleAfterCancel: boolean;
  input?: TimerInput;
  withoutPrevention: boolean;
  recordCelebration?: boolean;
}

export interface Session {
  _id: string;
  name: string;
  editing?: boolean;
  tName?: string;
  settings: SessionSettings;
}

export interface TimerPuzzleCategory {
  [name: string]: Solve[];
}

export interface TimerPuzzle {
  puzzle: string;
  title: string;
  categoriesStr: string[];
  categories: TimerPuzzleCategory;
}

export interface RawPuzzle {
  type: PuzzleType;
  mode: CubeMode;
  scramble: string;
  tips: number[];
  rotation: any;
  order: number[];
  view: CubeView;
  img?: string;
  raw?: any; // Intended for user specific purposes
}

declare type ArrowLarge = { type: 'arrow', text: string };
export declare type CubeType = Puzzle | RawPuzzle | ArrowLarge;

export interface BlockType {
  type: "title" | "subtitle" | "text" | "cubes";
  content ?: string;
  cubes?: CubeType[];
}

export interface Tutorial {
  _id: string;
  title: string;
  titleLower: string;
  puzzle: string;
  algs: number;
  content: BlockType[];
  level: number;
}

export interface Metric {
  value: number;
  better: boolean;
  id?: string;
  best?: number;
  prev?: number;
}

export interface Statistics {
  best: Metric;
  worst: Metric;
  avg: Metric;
  dev: Metric;
  count: Metric;
  time: Metric;
  Mo3: Metric;
  Ao5: Metric;
  Ao12: Metric;
  Ao50: Metric;
  Ao100: Metric;
  Ao200: Metric;
  Ao500: Metric;
  Ao1k: Metric;
  Ao2k: Metric;

  // Penalties
  NP: Metric;
  P2: Metric;
  DNF: Metric;
  DNS: Metric;
  counter: Metric;

  [key: string]: Metric;
}

export interface TimerContext {
  state: Writable<TimerState>;
  ready: Writable<boolean>;
  tab: Writable<number>;
  solves: Writable<Solve[]>;
  allSolves: Writable<Solve[]>;
  session: Writable<Session>;
  Ao5: Writable<number[]>;
  AoX: Writable<number>;
  stats: Writable<Statistics>;
  scramble: Writable<string>;
  group: Writable<number>;
  mode: Writable<{ 0: string, 1: string, 2: number }>;
  hintDialog: Writable<boolean>;
  hint: Writable<boolean>;
  cross: Writable<string>;
  xcross: Writable<string>;
  preview: Writable<string>;
  prob: Writable<number>;
  isRunning: Writable<boolean>;
  selected: Writable<number>;
  decimals: Writable<boolean>;
  
  sortSolves: () => any;
  updateStatistics: (inc ?: boolean) => any;
  initScrambler: (scr?: string, _mode ?: string) => any;
  selectedGroup: () => any;
  setConfigFromSolve: (s: Solve) => any;
  selectSolve: (s: Solve) => any;
  selectSolveById: (id: string, n: number) => any;
  editSolve: (s: Solve) => any;
}

export const ROLES = {
  CONTESTANT: 1 << 0,
  JUDGE:      1 << 1,
  SCRAMBLER:  1 << 2,
  ORGANIZER:  1 << 3,
  DELEGATE:   1 << 4,
  SPONSOR:    1 << 5,
  GUEST:      1 << 6,
};

// export const ROLES_STR = [ "Contestant", "Judge", "Scrambler", "Organizer", "Delegate", "Sponsor", "Guest" ];
export const ROLES_STR = [ "Competidor", "Juez", "Scrambler", "Organizador", "Delegado", "Patrocinador", "Invitado" ];

export interface ContestResult {
  round: number;
  solves: Solve[];
}

export interface Contestant {
  fullname: string;
  oid: string;
  age: number;
  // gender: "Male" | "Female";
  gender: "Hombre" | "Mujer";
  categories: string[];
  results: {
    [key: string]: ContestResult[];
  };
  role: number; // mask
  otherData: string;
  expanded?: boolean;
}

export interface CubeEvent {
  _id: string;
  name: string;
  place: string;
  date: string;
  status: "editing" | "running";
  contestants: Contestant[];
  inscriptionI: string;
  inscriptionF: string;
  inscriptionCost: number;
  rounds: {
    [key: string]: number;
  }
}

export interface Sheet {
  name: string;
  mode: string;
  round: number;
  buffer: Buffer;
}

export interface SheetRegistry {
  count: number;
  total: number;
  sheets: Sheet[];
  clear: () => any;
  save: () => any;
  addCount: (c: number) => any;
  addTotal: (c: number) => any;
  addSheet: (s: Sheet) => any;
}

export interface CubeDBData {
  sessions: Session[];
  solves: Solve[];
}

export interface Tab {
  name: string;
  id: string;
  index: number;
  icon: any;
  ariaLabel?: string;
}

// This is for import/export adaptors to implement
export interface CubeDBAdaptor {
  name: string;
  modes: string[];
  toCubeDB: (scr: string, mode?: number) => CubeDBData;
  fromCubeDB: (data: CubeDBData, mode?: number) => string;
}

export interface AlgorithmOptions {
  all?: boolean;
  path: string;
}

export interface IPC {
  handleAlgorithms: (fn: Function) => any;
  handleAny: (fn: Function) => any;
  handleCards: (fn: Function) => any;
  handleContests: (fn: Function) => any;
  handleSessions: (fn: Function) => any;
  handleSolves: (fn: Function) => any;
  handleTutorials: (fn: Function) => any;
  handleUpdate: (fn: Function) => any;
  
  getAlgorithms: (options: AlgorithmOptions) => any;
  updateAlgorithm: (alg: Algorithm) => any;
  getCards: () => any;
  
  getTutorials: () => any;
  addTutorial: (t: Tutorial) => any;
  updateTutorial: (t: Tutorial) => any;
  
  getSolves: () => any;
  addSolve: (s: Solve) => any;
  updateSolve: (s: Solve) => any;
  removeSolves: (s: Solve[]) => any;
  
  getSessions: () => any;
  addSession: (s: Session) => any;
  removeSession: (s: Session) => any;
  renameSession: (s: Session) => any;
  updateSession: (s: Session) => any;
  
  addContest: (c: CubeEvent) => any;
  getContests: () => any;
  updateContest: (c: CubeEvent) => any;
  removeContests: (c: CubeEvent[]) => any;
  
  minimize: () => any;
  maximize: () => any;
  close: () => any;
  
  generatePDF: (args: PDFOptions) => any;
  zipPDF: (s: { name: string, files: Sheet[]}) => any;
  openFile: (f: string) => any;
  revealFile: (f: string) => any;
  
  update: (cmd: UpdateCommand) => any;
  
  sleep: (s: boolean) => any;
}

export interface PDFOptions {
  width: number;
  height: number;
  html: string;
  mode: string;
  round: number;
}

export interface Game {
  players: { 0: string, 1: { name: string, times: number[] } }[];
  observers: { 0: string, 1: { name: string } }[];
  round: number;
  total: number;
  started: boolean;
}

export type StackmatSignalHeader = 'I' | 'S' | 'L' | 'R' | 'A' | 'C' | ' ';

export type StackmatCallback = (e: StackmatState) => void;

export interface StackmatState {
  device: string;
  time_milli: number;
  unit: number;
  on: boolean;
  greenLight: boolean;
  leftHand: boolean;
  rightHand: boolean;
  running: boolean;
  unknownRunning: boolean;
  signalHeader: StackmatSignalHeader;
  noise: number;
  power: number;
  stackmatId: string;
}

export interface NotificationAction {
  text: string;
  callback: (e: CustomEvent<any>) => void;
}

export interface INotification {
  key: string;
  header: string;
  text: string;
  html?: string;
  fixed?: boolean;
  timeout?: number;
  actions?: NotificationAction[];
}

export interface InputContext {
  state: Writable<TimerState>;
  ready: Writable<boolean>;
  session: Writable<Session>;
  time: Writable<number>;
  lastSolve: Writable<Solve | null>;
  isRunning: Writable<boolean>;
  stackmatStatus: Writable<boolean>;
  decimals: Writable<boolean>;

  reset: () => void;
  initScrambler: (scr?: string, _mode ?: string) => void;
  addSolve: (time?: number, penalty?: Penalty) => void;
  createNewSolve: () => void;
}

export interface TimerInputHandler {
  init: (...params: any[]) => void;
  disconnect: () => void;
  stopTimer: () => void;
  keyUpHandler: (e: KeyboardEvent) => void;
  keyDownHandler: (e: KeyboardEvent) => void;
}

export interface Language {
  name: string;
  code: string;
  global: {
    // Notification
    done: string;
    scrambleCopied: string;
    copiedToClipboard: string;
  }
  NAVBAR: {
    home: string;
    routeMap: (route: string) => string;
  },
  HOME: {
    tutorials: string;
    algorithms: string;
    timer: string;
    battle: string;
    pll_recognition: string;
    simulator: string;
    settings: string;
    importExport: string;
    contest: string;
  },
  SETTINGS: {
    title: string;
    language: string;
    appFont: string;
    timerFont: string;
    save: string;
    reset: string;

    // Notifications
    saved: string;
    settingsSaved: string;

    // Updates
    update: string;
    version: string;
    checkUpdate: string;
    updateAvailable: string;
    updateAvailableText: string;
    alreadyUpdated: string;
    alreadyUpdatedText: string;
    accept: string;

    cancelAction: string;
    updateAction: string;

    updateError: string;
    updateErrorText: string;

    updateCompleted: string;
    updateFailed: string;
  },
  ALGORITHMS: {
    solution: string;
    moves: string;
    case: string;
    algorithms: string;
  },
  TIMER: {
    // TimerTab
    stackmatStatus: string;
    cross: string;
    nextAo5: string;
    best: string;
    worst: string;
    average: string;
    deviation: string;
    count: string;

    cancel: string;
    save: string;

    congrats: string;
    from: string;

    // Stackmat
    stackmatAvailableHeader: string;
    stackmatAvailableText: string;
    connect: string;

    scramble: string;
    time: string;

    inputMethod: string;
    device: string;
    inspection: string;
    showTime: string;
    genImage: string;
    canHurtPerformance: string;
    refreshScramble: string;
    aoxCalculation: string;
    sequential: string;
    groupOfX: string;
    withoutPrevention: string;
    withoutPreventionDescription: string;
    recordCelebration: string;

    // Last solve tooltip
    delete: string;
    comments: string;

    reloadScramble: string;
    edit: string;
    useOldScramble: string;
    copyScramble: string;
    notes: string;
    settings: string;

    // Tab accesibility
    timerTab: string;
    sessionsTab: string;
    chartsTab: string;

    // Global Timer settings
    manageSessions: string;
    selectSession: string;
    selectGroup: string;
    selectMode: string;
    selectFilter: string;
    addNewSession: string;

    // Sessions Tab
    deleteAll: string;
    shareAo5: string;
    shareAo12: string;

    selectAll: string;
    selectInterval: string;
    invertSelection: string;

    comment: string;
    noPenalty: string;

    removeAllSolves: string;
    select: string;

    // Stats Tab
    totalTime: string;
    clean: string;
    solve: string;
    timeDistribution: string;
    timeChartLabels: string[];
    
    solves: string;
    hourDistribution: string;
    weekDistribution: string;
    histogram: string;

    // Best section
    bestMarks: string;
    go: string;
    bestList: {title: string, key: string, select: number }[];
    // ['Ao5', 'Ao12', 'Ao50', 'Ao100', 'Ao200', 'Ao500', 'Ao1k', 'Ao2k' ]
  },
  PLL: {
    title: string;
    topFace: string;
    cases: string;
    next: string;
    completed: string;
    tryAgain: string;
    
    colorNeutral: string;
    white: string;
    yellow: string;
    red: string;
    orange: string;
    blue: string;
    green: string;

    case: string;
    expected: string;
    answer: string;
    time: string;

    // Modal
    keyBindings: string;
    singleLetter: string;
    singleLetterBlock: string;

    twoVariant: string;
    twoVariantBlock: string;

    gPerms: string;
    gPermsBlock: string;
  },
  SIMULATOR: {
    settings: string;

    puzzleSettings: string;
    puzzle: string;
    order: string;
    cancel: string;
    setPuzzle: string;
  },
  IMPORT_EXPORT: {
    title: string;
    import: string;
    export: string;
    from: string;
    selectFile: string;
    selectAll: string;
    selectNone: string;
    save: string;
    total: string;
    showingOnly50: string;
  }
}

export type UpdateCommand = 'check' | 'download';