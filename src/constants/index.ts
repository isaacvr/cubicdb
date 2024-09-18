import { AverageSetting, type PuzzleOptions, type SessionSettings } from "@interfaces";
import { options } from "@cstimer/scramble/scramble";
import { readable } from "svelte/store";

export const EPS = 1e-6;

export enum CubeMode {
  NORMAL = 0,
  OLL,
  PLL,
  CMLL,
  F2L,
  COLL,
  WV,
  ELL,
  VLS,
  ZBLL,
  OLLCP,
  GRAY,
  CENTERS,
  CROSS,
  FL,
  YCROSS,
  CS,
  EO,
  CO,
  F3E,
  EDGERF,
  DPLL,
  L4E,
  CYCROSS,
}

export const CubeModeMap = [
  ["Normal", CubeMode.NORMAL],
  ["Gray", CubeMode.GRAY],
  ["Centers", CubeMode.CENTERS],

  ["Cross", CubeMode.CROSS],
  ["First Layer", CubeMode.FL],

  ["F2L", CubeMode.F2L],
  ["F3E", CubeMode.F3E],
  ["L4E", CubeMode.L4E],
  ["EDGERU", CubeMode.EDGERF],

  ["Yellow Cross", CubeMode.YCROSS],
  ["CYellow Cross", CubeMode.CYCROSS],
  ["OLL", CubeMode.OLL],
  ["OLLCP", CubeMode.OLLCP],
  ["PLL", CubeMode.PLL],
  ["DPLL", CubeMode.DPLL], // Dark face on top

  ["CMLL", CubeMode.CMLL],
  ["COLL", CubeMode.COLL],
  ["WV", CubeMode.WV],
  ["ELL", CubeMode.ELL],
  ["VLS", CubeMode.VLS],
  ["ZBLL", CubeMode.ZBLL],

  // SQ1
  ["Cube Shape", CubeMode.CS],
  ["Edge Orientation", CubeMode.EO],
  ["Corner Orientation", CubeMode.CO],
];

const COLORS = {
  green: "rgb(0, 157, 84)",
  red: "rgb(220,66,47)",
  blue: "rgb(61, 129, 246)",
  orange: "rgb(232, 112, 0)",
  yellow: "rgb(255,235,59)",
  white: "rgb(230, 230, 230)",
  black: "rgb(0, 0, 0)",
  // "gray": "rgb(80, 80, 80)",
  gray: "rgb(75, 81, 90)",
  darkGray: "rgb(50, 50, 50)",
  lightGray: "rgb(211, 211, 211)",
  violet: "rgb(138, 27, 255)",
  pink: "rgb(237, 150, 161)",
  lgreen: "rgb(74, 217, 49)",
  lyellow: "rgb(220, 211, 165)",
  lblue: "rgb(83, 177, 243)",

  /// Printable
  pgreen: "rgb(16, 162, 4)",
  pred: "rgb(213, 0, 0)",
  pblue: "rgb(43, 43, 255)",
  porange: "rgb(255, 108, 11)",
  pyellow: "rgb(255, 242, 0)",
  pwhite: "rgb(255, 255, 255)",
  pblack: "rgb(0, 0, 0)",
  pgray: "rgb(200, 200, 200)",
  pviolet: "rgb(185, 104, 251)",
  ppink: "rgb(249, 187, 204)",
  plgreen: "rgb(74, 217, 49)",
  plyellow: "rgb(255, 255, 183)",
  plblue: "rgb(83, 177, 243)",
};

export declare type ColorName = keyof typeof COLORS;

export function getColorByName(colorName: ColorName) {
  return COLORS[colorName] || (colorName as string);
}

export function getNameByColor(color: string): ColorName {
  let et = Object.entries(COLORS);
  for (let i = 0, maxi = et.length; i < maxi; i += 1) {
    if (et[i][1] === color) {
      return et[i][0] as ColorName;
    }
  }
  return "gray";
}

export function strToHex(color: string): number {
  let nums = color.split("(")[1].split(")")[0].split(",").map(Number);
  return (nums[0] << 16) | (nums[1] << 8) | nums[2];
}

export const STANDARD_PALETTE = {
  y: getColorByName("yellow"),
  r: getColorByName("red"),
  o: getColorByName("orange"),
  b: getColorByName("blue"),
  g: getColorByName("green"),
  w: getColorByName("white"),
  x: getColorByName("gray"),
  d: getColorByName("black"),
  v: getColorByName("violet"),
  k: getColorByName("yellow"),

  yellow: getColorByName("yellow"),
  red: getColorByName("red"),
  orange: getColorByName("orange"),
  blue: getColorByName("blue"),
  green: getColorByName("green"),
  white: getColorByName("white"),
  gray: getColorByName("gray"),
  darkGray: getColorByName("darkGray"),
  lightGray: getColorByName("lightGray"),
  black: getColorByName("black"),
  violet: getColorByName("violet"),
  pink: getColorByName("pink"),
  lblue: getColorByName("lblue"),
  lyellow: getColorByName("lyellow"),
  lgreen: getColorByName("lgreen"),
} as const;

export const PRINTABLE_PALETTE = {
  y: getColorByName("pyellow"),
  r: getColorByName("pred"),
  o: getColorByName("porange"),
  b: getColorByName("pblue"),
  g: getColorByName("pgreen"),
  w: getColorByName("pwhite"),
  x: getColorByName("pgray"),
  d: getColorByName("pblack"),
  v: getColorByName("pviolet"),

  yellow: getColorByName("pyellow"),
  red: getColorByName("pred"),
  orange: getColorByName("porange"),
  blue: getColorByName("pblue"),
  green: getColorByName("pgreen"),
  white: getColorByName("pwhite"),
  gray: getColorByName("pgray"),
  black: getColorByName("pblack"),
  violet: getColorByName("pviolet"),
  pink: getColorByName("ppink"),
  lblue: getColorByName("plblue"),
  lyellow: getColorByName("plyellow"),
  lgreen: getColorByName("plgreen"),
} as const;

export interface SCRAMBLE_MENU {
  0: string;
  1: { 0: string; 1: string; 2: number; 3?: number; 4?: number[] }[];
}

export const R222 = [
  "222so",
  "222o",
  "2223",
  "2226",
  "222eg",
  "222eg0",
  "222eg1",
  "222eg2",
  "222nb",
  "222tcp",
  "222tcn",
  "222lsall",
];
export const R333 = [
  "333",
  "333ni",
  "333fm",
  "333oh",
  "333o",
  "edges",
  "corners",
  "ll",
  "zbll",
  "cll",
  "ell",
  "lse",
  "lsemu",
  "cmll",
  "f2l",
  "lsll2",
  "2gll",
  "zbls",
  "zzll",
  "oll",
  "pll",
  "eoline",
  "easyc",
  "333ft",
  "333custom",
  "2gen",
  "2genl",
  "roux",
  "3gen_F",
  "3gen_L",
  "RrU",
  "half",
  "lsll",
  "coll",
  "eols",
  "wvls",
  "vls",
  "easyxc",
  "sbrx",
  "mt3qb",
  "mteole",
  "mttdr",
  "mt6cp",
  "mtcdrll",
  "mtl5ep",
  "ttll",
];
export const R444 = ["444wca", "444bld", "444m", "444", "444yj", "4edge", "RrUu"];
export const R555 = ["555wca", "555bld", "555", "5edge"];
export const R666 = ["666wca", "666si", "666p", "666s", "6edge"];
export const R777 = ["777wca", "777si", "777p", "777s", "7edge"];
export const PYRA = ["pyrso", "pyro", "pyrm", "pyrl4e", "pyr4c", "pyrnb"];
export const SKWB = ["skbso", "skbo", "skb", "skbnb"];
export const SQR1 = ["sqrs", "sqrcsp", "sq1h", "sq1t"];
export const CLCK = ["clkwca", "clk", "clkwca", "clko", "clkc", "clke"];
export const MEGA = ["mgmp", "mgmc", "mgmo", "minx2g", "mlsll", "mgmll", "mgmpll"];
export const KILO = ["klmso", "klmp"];
export const GIGA = ["giga"];
export const MISC = [
  ["r3", "r3ni"],
  "r234w",
  "r2345w",
  "r23456w",
  "r234567w",
  "r234",
  "r2345",
  "r23456",
  "r234567",
  "sq2",
  "bic",
  ["gearso", "gearo", "gear"],
  ["redim", "redi"],
  ["ivy", "ivyo", "ivyso"],
  ["prcp", "prco"],
  ["heli"],
  ["888"],
  ["999"],
  ["101010"],
  ["111111"],
  ["mpyr"],
  ["223"],
  ["233"],
  ["334"],
  ["336"],
  ["ssq1t"],
  ["fto"],
  ["133"],
  ["sfl"],
];

export const ICONS = [
  { icon: "222so", name: "2x2x2", scrambler: R222 },
  { icon: "333fm", name: "3x3x3 FM", scrambler: "333fm" },
  { icon: "333ni", name: "3x3x3 BF", scrambler: "333ni" },
  { icon: "r3ni", name: "3x3x3 MBF", scrambler: "r3ni" },
  { icon: "333oh", name: "3x3x3 OH", scrambler: "333oh" },
  { icon: "333", name: "3x3x3", scrambler: R333 },
  { icon: "444bld", name: "4x4x4 BLD", scrambler: "444bld" },
  { icon: "444wca", name: "4x4x4", scrambler: R444 },
  { icon: "555bld", name: "5x5x5 BLD", scrambler: "555bld" },
  { icon: "555wca", name: "5x5x5", scrambler: R555 },
  { icon: "666wca", name: "6x6x6", scrambler: R666 },
  { icon: "777wca", name: "7x7x7", scrambler: R777 },
  { icon: "clkwca", name: "Clock", scrambler: CLCK },
  { icon: "mgmp", name: "Megaminx", scrambler: MEGA },
  { icon: "pyrso", name: "Pyraminx", scrambler: PYRA },
  { icon: "skbso", name: "Skewb", scrambler: SKWB },
  { icon: "sqrs", name: "Square-1", scrambler: SQR1 },
  { icon: "333cross", name: "Cross", scrambler: "333cross" },
] as const;

export const CubeDBICON = "/assets/logo_dark.svg";

const OPTS: PuzzleOptions[] = [
  { type: "rubik", order: [2] },
  { type: "rubik", order: [3] },
  { type: "rubik", order: [4] },
  { type: "rubik", order: [5] },
  { type: "rubik", order: [6] },
  { type: "rubik", order: [7] },
  { type: "pyraminx", order: [3] },
  { type: "skewb" },
  { type: "square1" },
  { type: "clock" },
  { type: "megaminx", order: [3] },
  { type: "megaminx", order: [2] },
  { type: "megaminx", order: [5] },
];

const OPTS_MISC: PuzzleOptions[][] = [
  [{ type: "rubik", order: [3] }],
  [2, 3, 4].map(n => ({ type: "rubik", order: [n] })),
  [2, 3, 4, 5].map(n => ({ type: "rubik", order: [n] })),
  [2, 3, 4, 5, 6].map(n => ({ type: "rubik", order: [n] })),
  [2, 3, 4, 5, 6, 7].map(n => ({ type: "rubik", order: [n] })),
  [2, 3, 4].map(n => ({ type: "rubik", order: [n] })),
  [2, 3, 4, 5].map(n => ({ type: "rubik", order: [n] })),
  [2, 3, 4, 5, 6].map(n => ({ type: "rubik", order: [n] })),
  [2, 3, 4, 5, 6, 7].map(n => ({ type: "rubik", order: [n] })),
  [{ type: "square2" }],
  [{ type: "bicube" }],
  [{ type: "gear" }],
  [{ type: "redi" }],
  [{ type: "ivy" }],
  [{ type: "pyraminxCrystal" }],
  [{ type: "helicopter" }],
  [{ type: "rubik", order: [8] }],
  [{ type: "rubik", order: [9] }],
  [{ type: "rubik", order: [10] }],
  [{ type: "rubik", order: [11] }],
  [{ type: "pyraminx", order: [4] }],
  [{ type: "rubik", order: [2, 2, 3] }],
  [{ type: "rubik", order: [3, 3, 2] }],
  [{ type: "rubik", order: [3, 3, 4] }],
  [{ type: "rubik", order: [3, 3, 6] }],
  [{ type: "supersquare1" }],
  [{ type: "fto" }],
  [{ type: "rubik", order: [3, 3, 1] }],
  [{ type: "rubik", order: [3, 1, 3] }],
];

const MODES = [R222, R333, R444, R555, R666, R777, PYRA, SKWB, SQR1, CLCK, MEGA, KILO, GIGA];

for (let i = 0, maxi = MODES.length; i < maxi; i += 1) {
  OPTS[i].view = "2d";

  for (let j = 0, maxj = MODES[i].length; j < maxj; j += 1) {
    options.set(MODES[i][j], OPTS[i]);
  }
}

for (let i = 0, maxi = MISC.length; i < maxi; i += 1) {
  OPTS_MISC[i].forEach(opt => (opt.view = "2d"));

  if (typeof MISC[i] === "string") {
    options.set(MISC[i] as string, OPTS_MISC[i]);
  } else {
    (MISC[i] as string[]).forEach(m => options.set(m, OPTS_MISC[i]));
  }
}

export function isNNN(mode: string): boolean {
  return [R222, R333, R444, R555, R666, R777].some(l => l.some(m => m === mode));
}

export function getModeMap(MENU: SCRAMBLE_MENU[]) {
  return new Map<string, string>(
    (MENU as any[]).reduce(
      (acc, gp) => [
        ...acc,
        ...(gp[1] as any[]).map(md => [md[1], md[0] === "WCA" ? gp[0] : md[0]]),
      ],
      []
    )
  );
}

export const SessionDefaultSettings: SessionSettings = {
  hasInspection: true,
  showElapsedTime: true,
  inspection: 15,
  calcAoX: AverageSetting.SEQUENTIAL,
  genImage: true,
  scrambleAfterCancel: false,
  input: "Keyboard",
  withoutPrevention: true,
  recordCelebration: true,
  showBackFace: false,
  sessionType: "mixed",
};

export const AON = readable([3, 5, 12, 50, 100, 200, 500, 1000, 2000]);

export const STEP_COLORS = [
  "#2196F3",
  "#8BC34A",
  "#E91E63",
  "#FFEB3B",
  "#009688",
  "#FF5722",
  "#673AB7",
  "#FF9800",
  "#3F51B5",
  "#FFC107",
  "#4CAF50",
  "#F44336",
  "#9C27B0",
];
