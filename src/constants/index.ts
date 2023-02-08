import type { PuzzleOptions } from '@interfaces';
import { options } from '@cstimer/scramble/scramble';

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

const COLORS = {
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
  if ( COLORS.hasOwnProperty(colorName) ) {
    return COLORS[colorName];
  }

  return "rgb(150, 150, 150)";
}

export function getNameByColor(color: string): ColorName {
  for (let i in COLORS) {
    if ( COLORS[i] === color ) {
      return i;
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

interface Menu {
  0: string,
  1: { 0: string, 1: string, 2: number }[]
}

const R222 = [ "222so", "222o", "2223", "222eg", "222eg0", "222eg1", "222eg2", "222nb" ];
const R333 = [ "333", "333ni", "333fm", "333oh", "333o", "edges", "corners", "ll", "zbll", "cll", "ell", "lse", "lsemu", "cmll", "f2l", "lsll2", "2gll", "zbls", "zzll", "oll", "pll", "eoline", "easyc", "333ft", "2gen", "2genl", "roux", "3gen_F", "3gen_L", "RrU", "half", "lsll" ];
const R444 = [ "444wca", "444bld", "444m", "444", "444yj", "4edge", "RrUu" ];
const R555 = [ "555wca", "555bld", "555", "5edge" ];
const R666 = [ "666wca", "666si", "666p", "666s", "6edge" ];
const R777 = [ "777wca", "777si", "777p", "777s", "7edge" ];
const PYRA = [ "pyrso", "pyro", "pyrm", "pyrl4e", "pyr4c", "pyrnb" ];
const SKWB = [ "skbso", "skbo", "skb", "skbnb" ];
const SQR1 = [ "sqrs", "sqrcsp", "sq1h", "sq1t" ];
const CLCK = [ "clkwca", "clk", "clkwca", "clko", "clkc", "clke" ];
const MEGA = [ "mgmp", "mgmc", "mgmo" ];

const OPTS: PuzzleOptions[] = [
  { type: 'rubik', order: [2] }, { type: 'rubik', order: [3] }, { type: 'rubik', order: [4] },
  { type: 'rubik', order: [5] }, { type: 'rubik', order: [6] }, { type: 'rubik', order: [7] },
  { type: 'pyraminx', order: [3] }, { type: 'skewb' }, { type: 'square1' }, { type: 'clock' },
  { type: 'megaminx' }
];

const MODES = [ R222, R333, R444, R555, R666, R777, PYRA, SKWB, SQR1, CLCK, MEGA ];

for (let i = 0, maxi = MODES.length; i < maxi; i += 1) {
  OPTS[i].view = '2d';
  for (let j = 0, maxj = MODES[i].length; j < maxj; j += 1) {
    options.set(MODES[i][j], OPTS[i]);
  }
}

export const MENU: Menu[] = [
  [
    'WCA',
    [
      ['3x3x3',     "333", 0, 30, [3]],
      ['2x2x2',     "222so", 0, 30, [3]],
      ['4x4x4',     "444wca", -40, 40, [4]],
      ['5x5x5',     "555wca", -60, 48, [4]],
      ['6x6x6',     "666wca", -80, 54, [6]],
      ['7x7x7',     "777wca", -100, 60, [6]],
      ['3x3x3 BLD', "333ni", 0, 30, [3]],
      ['3x3 FM',    "333fm", 0, 30, [3]],
      ['3x3 OH',    "333oh", 0, 30, [3]],
      ['Clock',     "clkwca", 0, 30, [6]],
      ['Megaminx',  "mgmp", -70, 55, [5]],
      ['Pyraminx',  "pyrso", -10, 36, [3]],
      ['Skewb',     "skbso", 0, 33, [3]],
      ['Sq-1',      "sqrs", 0, 50, [8, 2]],
      ['4x4 BLD',   "444bld", -40, 40, [4]],
      ['5x5 BLD',   "555bld", -60, 48, [4]],
    ]
  ],
  [
    '3x3x3',
    [
      ["WCA", "333", 0],
      ['Random Move', "333o", 25],
      ['Edges only', "edges", 0],
      ['Corners only', "corners", 0],
      ['Last Layer (LL)', "ll", 0],
      ['ZBLL', "zbll", 0],
      ['LL Corners', "cll", 0],
      ['LL Edges', "ell", 0],
      ['Last six edges', "lse", 0],
      ['Last six edges <M,U>', "lsemu", 0],
      ['Roux L10P', "cmll", 0],
      ['F2L', "f2l", 0],
      ['LL and LE', "lsll2", 0],
      ['2GLL', "2gll", 0],
      ['ZBLS', "zbls", 0],
      ['ZZLL', "zzll", 0],
      ['OLL', "oll", 0],
      ['PLL', "pll", 0],
      ['EOLine', "eoline", 0],
      ['Easy Cross', "easyc", 3],
      ['3x3 FT', "333ft", 0]
    ]
  ],
  [
    '3x3x3 subsets', 
    [
      ['2-generator R,U', "2gen", 25],
      ['2-generator L,U', "2genl", 25],
      ['Roux-generator M,U', "roux", 25],
      ['3-generator F,R,U', "3gen_F", 25],
      ['3-generator R,U,L', "3gen_L", 25],
      ['3-generator R,r,U', "RrU", 25],
      ['half turns only', "half", 25],
      ['last slot + last layer (old)', "lsll", 15]
    ]
  ],
	[
    '2x2x2',
    [
      ["WCA", "222so", 0],
      ['Optimal', "222o", 0],
      ['3-gen', "2223", 25],
      ['EG', "222eg", 0],
      ['EG0', "222eg0", 0],
      ['EG1', "222eg1", 0],
      ['EG2', "222eg2", 0],
      ['No Bar', "222nb", 0]
    ]
  ],
	[
    '4x4x4',
    [
      ["WCA", "444wca", -40],
      ['Random State', "444m", 40],
      ['SiGN', "444", 40],
      ['YJ', "444yj", 40],
      ['Edges', "4edge", 8],
      ['R,r,U,u', "RrUu", 40]
    ]
  ],
	[
    '5x5x5',
    [
      ["WCA", "555wca", 60],
      ['SiGN', "555", 60],
      ['Edges', "5edge", 8]
    ]
  ],
	[
    '6x6x6',
    [
      ["WCA", "666wca", 80],
      ['SiGN', "666si", 80],
      ['Prefix', "666p", 80],
      ['Suffix', "666s", 80],
      ['Edges', "6edge", 8]
    ]
  ],
	[
    '7x7x7',
    [
      ["WCA", "777wca", 100],
      ['SiGN', "777si", 100],
      ['Prefix', "777p", 100],
      ['Suffix', "777s", 100],
      ['Edges', "7edge", 8]
    ]
  ],
	[
    'Clock',
    [
      ['WCA', "clkwca", 0],
      ['JAAP', "clk", 0],
      ['Optimal', "clko", 0],
      ['Conciso', "clkc", 0],
      ['Efficient Pin Order', "clke", 0]
    ]
  ],
	[
    'Megaminx',
    [
      ["WCA", "mgmp", 70],
      ['Carrot', "mgmc", 70],
      ['Old Style', "mgmo", 70]
    ]
  ],
	[
    'Pyraminx',
    [
      ["WCA", "pyrso", 10],
      ['Optimal', "pyro", 0],
      ['Random Move', "pyrm", 25],
      ['L4E', "pyrl4e", 0],
      ['4 tips', "pyr4c", 0],
      ['No bar', "pyrnb", 0]
    ]
  ],
	[
    'Skewb',
    [
      ["WCA", "skbso", 0],
      ['Optimal', "skbo", 0],
      ['Random Move', "skb", 25],
      ['No bar', "skbnb", 0]
    ]
  ],
	[
    'Square-1',
    [
      ["WCA", "sqrs", 0],
      ["CSP", "sqrcsp", 0],
      ['Face Turn Metric', "sq1h", 40],
      ['Twist Metric', "sq1t", 20]
    ]
  ],
];

export function isNNN(mode: string): boolean {
  return [
    R222, R333, R444, R555, R666, R777
  ].some(l => l.some(m => m === mode))
}

export const MODE_MAP = new Map<string, string>(
  MENU.reduce((acc, gp) => [...acc, ...gp[1].map(md =>
    [md[1], md[0] === 'WCA' ? gp[0] : md[0]]
  )], [])
);