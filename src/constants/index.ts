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
  "violet": "rgb(138, 27, 255)",
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
};