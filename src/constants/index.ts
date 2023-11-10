import { AverageSetting, type PuzzleOptions, type SessionSettings } from '@interfaces';
import { options } from '@cstimer/scramble/scramble';
import { readable } from 'svelte/store';

export enum CubeMode {
  NORMAL = 0, OLL, PLL, CMLL, F2L, COLL, WV, ELL, VLS, ZBLL, OLLCP, GRAY, CENTERS, CROSS, FL, YCROSS
};

export const CubeModeMap = [
  [ 'Normal', CubeMode.NORMAL ],
  [ 'OLL', CubeMode.OLL ],
  [ 'PLL', CubeMode.PLL ],
  [ 'CMLL', CubeMode.CMLL ],
  [ 'F2L', CubeMode.F2L ],
  [ 'COLL', CubeMode.COLL ],
  [ 'WV', CubeMode.WV ],
  [ 'ELL', CubeMode.ELL ],
  [ 'VLS', CubeMode.VLS ],
  [ 'ZBLL', CubeMode.ZBLL ],
  [ 'OLLCP', CubeMode.OLLCP ],
  [ 'Gray', CubeMode.GRAY ],
  [ 'Centers', CubeMode.CENTERS ],
  [ 'Cross', CubeMode.CROSS ],
  [ 'First Layer', CubeMode.FL ],
  [ 'Yellow Cross', CubeMode.YCROSS ],
];

// export declare type ColorName = 'green' | 'red' | 'blue' | 'orange' | 'yellow' | 'white' | 'gray' | 'black';
export declare type ColorName = string;

const COLORS: { [key: string]: string } = {
  "green": "rgb(0, 157, 84)",
  "red": "rgb(220,66,47)",
  "blue": "rgb(61, 129, 246)",
  "orange": "rgb(232, 112, 0)",
  "yellow": "rgb(255,235,59)",
  "white": "rgb(230, 230, 230)",
  "black": "rgb(0, 0, 0)",
  "gray": "rgb(80, 80, 80)",
  "lightGray": "rgb(232, 232, 232)",
  "violet": "rgb(138, 27, 255)",
  "pink": "rgb(237, 150, 161)",
  "lgreen": "rgb(74, 217, 49)",
  "lyellow": "rgb(220, 211, 165)",
  "lblue": "rgb(83, 177, 243)",
  
  /// Printable
  "pgreen": "rgb(16, 162, 4)",
  "pred": "rgb(213, 0, 0)",
  "pblue": "rgb(43, 43, 255)",
  "porange": "rgb(255, 108, 11)",
  "pyellow": "rgb(255, 242, 0)",
  "pwhite": "rgb(255, 255, 255)",
  "pblack": "rgb(0, 0, 0)",
  "pgray": "rgb(200, 200, 200)",
  "pviolet": "rgb(185, 104, 251)",
  "ppink": "rgb(249, 187, 204)",
  "plgreen": "rgb(74, 217, 49)",
  "plyellow": "rgb(255, 255, 183)",
  "plblue": "rgb(83, 177, 243)",
};

export function getColorByName(colorName: ColorName) {
  return COLORS[ colorName ] || "rgb(150, 150, 150)";
}

export function getNameByColor(color: string): ColorName {
  let et = Object.entries(COLORS);
  for (let i = 0, maxi = et.length; i < maxi; i += 1) {
    if ( et[i][1] === color ) {
      return et[i][0];
    }
  }
  return "gray";
}

export function strToHex(color: string): number {
  let nums = color.split('(')[1].split(')')[0].split(',').map(Number);
  return (nums[0] << 16) | (nums[1] << 8) | (nums[2]);
}

export const STANDARD_PALETTE = {
  y: getColorByName('yellow'),
  r: getColorByName('red'),
  o: getColorByName('orange'),
  b: getColorByName('blue'),
  g: getColorByName('green'),
  w: getColorByName('white'),
  x: getColorByName('gray'),
  d: getColorByName('black'),
  v: getColorByName('violet'),

  yellow:    getColorByName('yellow'),
  red:       getColorByName('red'),
  orange:    getColorByName('orange'),
  blue:      getColorByName('blue'),
  green:     getColorByName('green'),
  white:     getColorByName('white'),
  gray:      getColorByName('gray'),
  lightGray: getColorByName('lightGray'),
  black:     getColorByName('black'),
  violet:    getColorByName('violet'),
  pink:      getColorByName('pink'),
  lblue:     getColorByName('lblue'),
  lyellow:   getColorByName('lyellow'),
  lgreen:    getColorByName('lgreen'),
};

export const PRINTABLE_PALETTE = {
  y: getColorByName('pyellow'),
  r: getColorByName('pred'),
  o: getColorByName('porange'),
  b: getColorByName('pblue'),
  g: getColorByName('pgreen'),
  w: getColorByName('pwhite'),
  x: getColorByName('pgray'),
  d: getColorByName('pblack'),
  v: getColorByName('pviolet'),

  yellow:  getColorByName('pyellow'),
  red:     getColorByName('pred'),
  orange:  getColorByName('porange'),
  blue:    getColorByName('pblue'),
  green:   getColorByName('pgreen'),
  white:   getColorByName('pwhite'),
  gray:    getColorByName('pgray'),
  black:   getColorByName('pblack'),
  violet:  getColorByName('pviolet'),
  pink:    getColorByName('ppink'),
  lblue:   getColorByName('plblue'),
  lyellow: getColorByName('plyellow'),
  lgreen:  getColorByName('plgreen'),
};

export const PX_IMAGE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQIW2NgAAIAAAUAAR4f7BQAAAAASUVORK5CYII=";

export interface SCRAMBLE_MENU {
  0: string,
  1: { 0: string, 1: string, 2: number, 3?: number, 4?: number[] }[]
}

export const R222 = [ "222so", "222o", "2223", "2226", "222eg", "222eg0", "222eg1", "222eg2", "222nb", "222tcp", "222tcn", "222lsall" ];
export const R333 = [ "333", "333ni", "333fm", "333oh", "333o", "edges", "corners", "ll", "zbll", "cll", "ell", "lse", "lsemu", "cmll", "f2l", "lsll2", "2gll", "zbls", "zzll", "oll", "pll", "eoline", "easyc", "333ft", "333custom", "2gen", "2genl", "roux", "3gen_F", "3gen_L", "RrU", "half", "lsll", "coll", "eols", "wvls", "vls", "easyxc", "sbrx", "mt3qb", "mteole", "mttdr", "mt6cp", "mtcdrll", "mtl5ep", "ttll" ];
export const R444 = [ "444wca", "444bld", "444m", "444", "444yj", "4edge", "RrUu" ];
export const R555 = [ "555wca", "555bld", "555", "5edge" ];
export const R666 = [ "666wca", "666si", "666p", "666s", "6edge" ];
export const R777 = [ "777wca", "777si", "777p", "777s", "7edge" ];
export const PYRA = [ "pyrso", "pyro", "pyrm", "pyrl4e", "pyr4c", "pyrnb" ];
export const SKWB = [ "skbso", "skbo", "skb", "skbnb" ];
export const SQR1 = [ "sqrs", "sqrcsp", "sq1h", "sq1t" ];
export const CLCK = [ "clkwca", "clk", "clkwca", "clko", "clkc", "clke" ];
export const MEGA = [ "mgmp", "mgmc", "mgmo", "minx2g", "mlsll" ];
export const KILO = [ "kilo" ];
export const GIGA = [ "giga" ];

const OPTS: PuzzleOptions[] = [
  { type: 'rubik', order: [2] }, { type: 'rubik', order: [3] }, { type: 'rubik', order: [4] },
  { type: 'rubik', order: [5] }, { type: 'rubik', order: [6] }, { type: 'rubik', order: [7] },
  { type: 'pyraminx', order: [3] }, { type: 'skewb' }, { type: 'square1' }, { type: 'clock' },
  { type: 'megaminx', order: [3] }, { type: 'megaminx', order: [2] }, { type: 'megaminx', order: [4] }
];

const MODES = [ R222, R333, R444, R555, R666, R777, PYRA, SKWB, SQR1, CLCK, MEGA, KILO, GIGA ];

for (let i = 0, maxi = MODES.length; i < maxi; i += 1) {
  OPTS[i].view = '2d';
  for (let j = 0, maxj = MODES[i].length; j < maxj; j += 1) {
    options.set(MODES[i][j], OPTS[i]);
  }
}

export function isNNN(mode: string): boolean {
  return [
    R222, R333, R444, R555, R666, R777
  ].some(l => l.some(m => m === mode))
}

export function getModeMap(MENU: SCRAMBLE_MENU[]) {
  return new Map<string, string>(
    (MENU as any[]).reduce((acc, gp) => [...acc, ...(gp[1] as any[]).map(md =>
      [md[1], md[0] === 'WCA' ? gp[0] : md[0]]
    )], [])
  );
}

export const SessionDefaultSettings: SessionSettings = {
  hasInspection: true,
  showElapsedTime: true,
  inspection: 15,
  calcAoX: AverageSetting.SEQUENTIAL,
  genImage: true,
  scrambleAfterCancel: false,
  input: 'Keyboard',
  withoutPrevention: true,
  recordCelebration: true,
  showBackFace: false,
  sessionType: 'mixed'
};

export const AON = readable([ 3, 5, 12, 50, 100, 200, 500, 1000, 2000 ]);

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