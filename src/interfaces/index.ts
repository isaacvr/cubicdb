import type { Puzzle } from './../classes/puzzle/puzzle';
import type { Sticker } from './../classes/puzzle/Sticker';
import type { Piece } from './../classes/puzzle/Piece';
import type { Vector3D } from '../classes/vector3d';
import type { CubeMode } from "../constants";
import type { Writable } from 'svelte/store';

export declare type PuzzleType = 'rubik' | 'skewb' | 'square1' | 'pyraminx' | 'axis' | 'fisher' | 'ivy' | 'clock' | 'megaminx' | 'mirror' | 'dino' | 'rex' | 'redi' | 'mixup' | 'pyramorphix' | 'gear' | 'dreidel' | 'bandaged222' | 'bicube' | 'square2';
export declare type CubeView = 'plan' | 'trans' | '2d';

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
}

export interface NavigationRoute {
  link: string;
  name: string;
}

export interface PuzzleInterface {
  pieces: Piece[];
  palette: any;
  rotation: any;
  center: Vector3D;
  faceVectors: Vector3D[];
  faceColors: string[];
  getAllStickers: () => Sticker[];
  move: (any) => any;

  dims?: number[];
  raw?: any;
  scramble?: () => any;
  toMove?: (...args) => any;
  vectorsFromCamera?: (...args) => any;
}

export interface PuzzleOptions {
  type: PuzzleType;
  order?: number[];
  mode?: CubeMode;
  view?: CubeView;
  tips?: number[];
  headless?: boolean;
}

export enum Penalty {
  NONE = 0, P2 = 1, DNF = 2
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

export interface Settings {
  hasInspection: boolean;
  inspection: number;
  showElapsedTime: boolean;
  calcAoX: AverageSetting;
}

export interface Session {
  _id: string;
  name: string;
  editing?: boolean;
  tName?: string;
  settings: Settings;
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
  raw?: any; // Intended for user specific purposes
}

export declare type CubeType = Puzzle | RawPuzzle | { type: 'arrow', text: string } | { tp: 'arrow', tx: string };

export interface BlockType {
  type: "title" | "text" | "cubes";
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
}

export interface Statistics {
  best: Metric;
  worst: Metric;
  avg: Metric;
  dev: Metric;
  count: Metric;
  Mo3: Metric;
  Ao5: Metric;
  Ao12: Metric;
  Ao50: Metric;
  Ao100: Metric;
  Ao200: Metric;
  Ao500: Metric;
  Ao1k: Metric;
  Ao2k: Metric;
  __counter: number;
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
  cross: Writable<string[]>;
  xcross: Writable<string>;
  preview: Writable<string>;
  prob: Writable<number>;
  
  sortSolves();
  updateStatistics(inc ?: boolean);
  initScrambler(scr?: string, _mode ?: string);
  selectedGroup();
  setConfigFromSolve(s: Solve);
}