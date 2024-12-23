import { minmax } from "./math";

export interface RGBAColor {
  red: number;
  green: number;
  blue: number;
  alpha: number;
  name?: string;
}

interface XYZColor {
  x: number;
  y: number;
  z: number;
}

interface CMYKColor {
  cyan: number;
  magenta: number;
  yellow: number;
  key: number;
}

interface HSLColor {
  hue: number;
  saturation: number;
  lightness: number;
}

interface LABColor {
  lightness: number;
  redGreen: number;
  blueYellow: number;
}

export type IColorDistance = "XYZ" | "CMYK" | "HSL" | "DELTA_E" | "RGB";
export type IMethod = "CLOSEST_COLOR" | "ORDERED" | "ERROR_DIFFUSION";

export function convertRgbToXyz(rgbColor: RGBAColor): XYZColor {
  const convert = (color: number) => {
    color = color / 255;
    color = color > 0.04045 ? Math.pow((color + 0.055) / 1.055, 2.4) : color / 12.92;
    color = color * 100;
    return color;
  };

  let { red, green, blue } = rgbColor;

  red = convert(red);
  green = convert(green);
  blue = convert(blue);

  const x = red * 0.4124564 + green * 0.3575761 + blue * 0.1804375;
  const y = red * 0.2126729 + green * 0.7151522 + blue * 0.072175;
  const z = red * 0.0193339 + green * 0.119192 + blue * 0.9503041;

  return {
    x,
    y,
    z,
  };
}

export function convertRgbToCmyk(rgbColor: RGBAColor): CMYKColor {
  const { red, green, blue } = rgbColor;

  let cyan = 255 - red;
  let magenta = 255 - green;
  let yellow = 255 - blue;
  let key = Math.min(cyan, magenta, yellow);

  const divider = key === 255 ? 1 : 255 - key;

  cyan = Math.round(((cyan - key) / divider) * 100);
  magenta = Math.round(((magenta - key) / divider) * 100);
  yellow = Math.round(((yellow - key) / divider) * 100);
  key = Math.round((key / 255) * 100);

  return {
    cyan,
    magenta,
    yellow,
    key,
  };
}

export function convertRgbToHsl(rgbcolor: RGBAColor): HSLColor {
  let { red, green, blue } = rgbcolor;

  red = red / 255;
  green = green / 255;
  blue = blue / 255;

  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const basis = (maximum + minimum) / 2;

  let hue;
  let saturation;
  const lightness = basis;

  if (maximum === minimum) {
    hue = 0;
    saturation = 0;
  } else {
    const difference = maximum - minimum;
    saturation =
      lightness > 0.5 ? difference / (2 - maximum - minimum) : difference / (maximum + minimum);
    switch (maximum) {
      case red:
        hue = (green - blue) / difference + (green < blue ? 6 : 0);
        break;
      case green:
        hue = (blue - red) / difference + 2;
        break;
      case blue:
      default:
        hue = (red - green) / difference + 4;
        break;
    }
    hue = hue / 6;
  }

  return {
    hue,
    saturation,
    lightness,
  };
}

export function convertRgbToLab(rgbColor: RGBAColor) {
  const xyzColor = convertRgbToXyz(rgbColor);
  return convertXyzToLab(xyzColor);
}

export function convertXyzToLab(xyzColor: XYZColor): LABColor {
  const adjust = (value: number) =>
    value > 0.008856 ? Math.pow(value, 1 / 3) : 7.787 * value + 16 / 116;

  let { x, y, z } = xyzColor;
  // using 10o Observer (CIE 1964)
  // CIE10_D65 = {94.811f, 100f, 107.304f} => Daylight

  // step 1
  x = x / 94.811;
  y = y / 100;
  z = z / 107.304;

  // step 2
  x = adjust(x);
  y = adjust(y);
  z = adjust(z);

  // step 3
  const lightness = 116 * y - 16;
  const redGreen = 500 * (x - y);
  const blueYellow = 200 * (y - z);

  return {
    lightness,
    redGreen,
    blueYellow,
  };
}

export function calculateDeltaE2000(labColor1: LABColor, labColor2: LABColor) {
  const { lightness: lightness1, redGreen: redGreen1, blueYellow: blueYellow1 } = labColor1;
  const { lightness: lightness2, redGreen: redGreen2, blueYellow: blueYellow2 } = labColor2;

  function rad2deg(rad: number) {
    return (360 * rad) / (2 * Math.PI);
  }

  function deg2rad(deg: number) {
    return (2 * Math.PI * deg) / 360;
  }

  // Start Equation
  // Equation exist on the following URL http://www.brucelindbloom.com/index.html?Eqn_DeltaE_CIE2000.html
  const avgL = (lightness1 + lightness2) / 2;
  const c1 = Math.sqrt(Math.pow(redGreen1, 2) + Math.pow(blueYellow1, 2));
  const c2 = Math.sqrt(Math.pow(redGreen2, 2) + Math.pow(blueYellow2, 2));
  const avgC = (c1 + c2) / 2;
  const g = (1 - Math.sqrt(Math.pow(avgC, 7) / (Math.pow(avgC, 7) + Math.pow(25, 7)))) / 2;
  const a1p = redGreen1 * (1 + g);
  const a2p = redGreen2 * (1 + g);
  const c1p = Math.sqrt(Math.pow(a1p, 2) + Math.pow(blueYellow1, 2));
  const c2p = Math.sqrt(Math.pow(a2p, 2) + Math.pow(blueYellow2, 2));
  const avgCp = (c1p + c2p) / 2;
  let h1p = rad2deg(Math.atan2(blueYellow1, a1p));

  if (h1p < 0) {
    h1p = h1p + 360;
  }

  let h2p = rad2deg(Math.atan2(blueYellow2, a2p));

  if (h2p < 0) {
    h2p = h2p + 360;
  }

  const avghp = Math.abs(h1p - h2p) > 180 ? (h1p + h2p + 360) / 2 : (h1p + h2p) / 2;
  const t =
    1 -
    0.17 * Math.cos(deg2rad(avghp - 30)) +
    0.24 * Math.cos(deg2rad(2 * avghp)) +
    0.32 * Math.cos(deg2rad(3 * avghp + 6)) -
    0.2 * Math.cos(deg2rad(4 * avghp - 63));

  let deltahp = h2p - h1p;

  if (Math.abs(deltahp) > 180) {
    if (h2p <= h1p) {
      deltahp += 360;
    } else {
      deltahp -= 360;
    }
  }
  const deltalp = lightness2 - lightness1;
  const deltacp = c2p - c1p;

  deltahp = 2 * Math.sqrt(c1p * c2p) * Math.sin(deg2rad(deltahp) / 2);

  const sl = 1 + (0.015 * Math.pow(avgL - 50, 2)) / Math.sqrt(20 + Math.pow(avgL - 50, 2));
  const sc = 1 + 0.045 * avgCp;
  const sh = 1 + 0.015 * avgCp * t;
  const deltaro = 30 * Math.exp(-Math.pow((avghp - 275) / 25, 2));
  const rc = 2 * Math.sqrt(Math.pow(avgCp, 7) / (Math.pow(avgCp, 7) + Math.pow(25, 7)));
  const rt = -rc * Math.sin(2 * deg2rad(deltaro));
  const kl = 1;
  const kc = 1;
  const kh = 1;

  return Math.sqrt(
    Math.pow(deltalp / (kl * sl), 2) +
      Math.pow(deltacp / (kc * sc), 2) +
      Math.pow(deltahp / (kh * sh), 2) +
      rt * (deltacp / (kc * sc)) * (deltahp / (kh * sh))
  );
}

export function getClosestColorInThePalette(
  referenceColor: RGBAColor,
  palette: RGBAColor[],
  algorithm: IColorDistance
) {
  const key = `${referenceColor.red},${referenceColor.green},${referenceColor.blue}`;

  let closestColor: RGBAColor = {
    blue: -1,
    green: -1,
    red: -1,
    alpha: -1,
  };

  let shortestDistance = Number.MAX_SAFE_INTEGER;

  palette.forEach(paletteColor => {
    if (shortestDistance === 0) return;
    let distance;
    switch (algorithm) {
      case "XYZ":
        const { x: paletteX, y: paletteY, z: paletteZ } = convertRgbToXyz(paletteColor);
        const { x: referenceX, y: referenceY, z: referenceZ } = convertRgbToXyz(referenceColor);
        distance = Math.sqrt(
          Math.pow(referenceX - paletteX, 2) +
            Math.pow(referenceY - paletteY, 2) +
            Math.pow(referenceZ - paletteZ, 2)
        );
        break;
      case "CMYK":
        const {
          cyan: paletteCyan,
          magenta: paletteMagenta,
          yellow: paletteYellow,
          key: paletteKey,
        } = convertRgbToCmyk(paletteColor);
        const {
          cyan: referenceCyan,
          magenta: referenceMagenta,
          yellow: referenceYellow,
          key: referenceKey,
        } = convertRgbToCmyk(referenceColor);
        distance = Math.sqrt(
          Math.pow(referenceCyan - paletteCyan, 2) +
            Math.pow(referenceMagenta - paletteMagenta, 2) +
            Math.pow(referenceYellow - paletteYellow, 2) +
            Math.pow(referenceKey - paletteKey, 2)
        );
        break;
      case "HSL":
        const {
          hue: paletteHue,
          saturation: paletteSaturation,
          lightness: paletteLightness,
        } = convertRgbToHsl(paletteColor);
        const {
          hue: referenceHue,
          saturation: referenceSaturation,
          lightness: referenceLightness,
        } = convertRgbToHsl(referenceColor);
        distance = Math.sqrt(
          Math.pow(referenceHue - paletteHue, 2) +
            Math.pow(referenceSaturation - paletteSaturation, 2) +
            Math.pow(referenceLightness - paletteLightness, 2)
        );
        break;
      case "DELTA_E":
        const paletteLabColor = convertRgbToLab(paletteColor);
        const referenceLabColor = convertRgbToLab(referenceColor);
        distance = calculateDeltaE2000(paletteLabColor, referenceLabColor);
        break;
      case "RGB":
      default:
        distance = Math.sqrt(
          Math.pow(paletteColor.red - referenceColor.red, 2) +
            Math.pow(paletteColor.green - referenceColor.green, 2) +
            Math.pow(paletteColor.blue - referenceColor.blue, 2)
        );
        break;
    }

    if (distance < shortestDistance) {
      shortestDistance = distance;
      closestColor = paletteColor;
    }
  });

  return closestColor;
}

export function applyDithering(noise: RGBAColor[][], color: RGBAColor, x: number, y: number) {
  const ditheredColor: RGBAColor = { ...color };

  if (Object.hasOwn(noise, y) && Object.hasOwn(noise[y], x)) {
    ditheredColor.red += noise[y][x].red;
    ditheredColor.green += noise[y][x].green;
    ditheredColor.blue += noise[y][x].blue;

    ditheredColor.red = minmax(ditheredColor.red, 0, 255);
    ditheredColor.green = minmax(ditheredColor.green, 0, 255);
    ditheredColor.blue = minmax(ditheredColor.blue, 0, 255);
  }

  return ditheredColor;
}

export function getPixelIndex(imageData: ImageData, x: number, y: number) {
  return (imageData.width * y + x) * 4;
}

export function getPixelFromImageData(imageData: ImageData, x: number, y: number) {
  const index = getPixelIndex(imageData, x, y);

  return {
    red: [imageData.data[index], index],
    green: [imageData.data[index + 1], index + 1],
    blue: [imageData.data[index + 2], index + 2],
    alpha: [imageData.data[index + 2], index + 3],
    x,
    y,
  };
}

export function getRgbFromImageData(imageData: ImageData, x: number, y: number): RGBAColor {
  const pixelObject = getPixelFromImageData(imageData, x, y);
  const [red] = pixelObject.red;
  const [green] = pixelObject.green;
  const [blue] = pixelObject.blue;
  const [alpha] = pixelObject.alpha;

  return {
    red,
    green,
    blue,
    alpha,
    name: "",
  };
}

export function calculateAverageColor(
  imageData: RGBAColor[][],
  _x: number,
  _y: number,
  blockX: number,
  blockY: number
): RGBAColor {
  let redSum = 0;
  let greenSum = 0;
  let blueSum = 0;
  let alphaSum = 0;
  let counter = 0;

  for (let x = _x, maxx = _x + blockX; x < maxx; x += 1) {
    for (let y = _y, maxy = _y + blockY; y < maxy; y += 1) {
      const { red, green, blue, alpha } = imageData[x][y];
      redSum += red;
      greenSum += green;
      blueSum += blue;
      alphaSum += alpha;
      counter++;
    }
  }
  return {
    red: Math.round(redSum / counter),
    green: Math.round(greenSum / counter),
    blue: Math.round(blueSum / counter),
    alpha: Math.round(alphaSum / counter),
  };
}

export function recordNoise(
  noise: RGBAColor[][],
  color1: RGBAColor,
  color2: RGBAColor,
  x: number,
  y: number,
  block: number
) {
  const redError = color1.red - color2.red;
  const greenError = color1.green - color2.green;
  const blueError = color1.blue - color2.blue;
  const noiseObject: RGBAColor = {
    red: 0,
    green: 0,
    blue: 0,
    alpha: 255,
  };

  if (!Object.hasOwn(noise, y)) {
    noise[y] = [];
  }

  if (!Object.hasOwn(noise, y + block)) {
    noise[y + block] = [];
  }

  if (!Object.hasOwn(noise[y], x + block)) {
    noise[y][x + block] = { ...noiseObject };
  }

  if (!Object.hasOwn(noise[y + block], x - block)) {
    noise[y + block][x - block] = { ...noiseObject };
  }

  if (!Object.hasOwn(noise[y + block], x)) {
    noise[y + block][x] = { ...noiseObject };
  }

  if (!Object.hasOwn(noise[y + block], x + block)) {
    noise[y + block][x + block] = { ...noiseObject };
  }

  noise[y][x + block].red += (redError * 7) / 16;
  noise[y][x + block].green += (greenError * 7) / 16;
  noise[y][x + block].blue += (blueError * 7) / 16;
  noise[y + block][x - block].red += (redError * 3) / 16;
  noise[y + block][x - block].green += (greenError * 3) / 16;
  noise[y + block][x - block].blue += (blueError * 3) / 16;
  noise[y + block][x].red += (redError * 5) / 16;
  noise[y + block][x].green += (greenError * 5) / 16;
  noise[y + block][x].blue += (blueError * 5) / 16;
  noise[y + block][x + block].red += redError / 16;
  noise[y + block][x + block].green += greenError / 16;
  noise[y + block][x + block].blue += blueError / 16;

  return noise;
}

export function getLuminance(color: RGBAColor) {
  return color.alpha === 0 ? 0 : color.red * 0.2126 + color.green * 0.7152 + color.blue * 0.0722;
}

export function getClosesLuminanceColor(color: RGBAColor, ranges: number[]): number {
  const value = getLuminance(color);

  for (let i = 0, maxi = ranges.length - 1; i < maxi; i += 1) {
    if (ranges[i] <= value && value <= ranges[i + 1]) {
      return i;
    }
  }

  return 0;
}

export function cloneRGBMatrix(imageData: RGBAColor[][]): RGBAColor[][] {
  return imageData.map(row => row.map((color): RGBAColor => ({ ...color })));
}

export function orderedDither(
  imageData: RGBAColor[][],
  palette: RGBAColor[],
  ratio: number,
  algorithm: IColorDistance
) {
  const data: RGBAColor[][] = cloneRGBMatrix(imageData);
  const w = imageData[0].length;
  const h = imageData.length;
  const m = [
    [1, 9, 3, 11],
    [13, 5, 15, 7],
    [4, 12, 2, 10],
    [16, 8, 14, 6],
  ];

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const rgb = data[y][x];

      rgb.red += m[x % 4][y % 4] * ratio;
      rgb.green += m[x % 4][y % 4] * ratio;
      rgb.blue += m[x % 4][y % 4] * ratio;

      const color: RGBAColor = { ...rgb };
      data[y][x] = getClosestColorInThePalette(color, palette, algorithm);
    }
  }

  return data;
}

export function errorDiffusionDither(
  imageData: ImageData,
  palette: RGBAColor[],
  algorithm: IColorDistance,
  ratioDenom = 3
) {
  const d = new Uint8ClampedArray(imageData.data);
  const out = getColorMatrix(imageData);
  const w = imageData.width;
  const h = imageData.height;
  const step = 1;
  const ratioDenomScaled = 1.5 + (ratioDenom / 5) * (15 - 1.5);
  const ratio = 1 / (ratioDenomScaled * 4);

  const $i = function (x: number, y: number) {
    return 4 * x + 4 * y * w;
  };

  let r, g, b, a, q, i, approx, tr, tg, tb, dx, dy, di;

  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      i = 4 * x + 4 * y * w;

      // Define bytes
      r = i;
      g = i + 1;
      b = i + 2;
      a = i + 3;

      // color = [d[r], d[g], d[b]];
      const color: RGBAColor = { red: d[r], green: d[g], blue: d[b], alpha: d[a] };

      approx = getClosestColorInThePalette(color, palette, algorithm);

      q = [];
      q[r] = d[r] - approx.red;
      q[g] = d[g] - approx.green;
      q[b] = d[b] - approx.blue;

      // Diffuse the error
      d[$i(x + step, y)] = d[$i(x + step, y)] + 7 * ratio * q[r];
      d[$i(x - step, y + 1)] = d[$i(x - 1, y + step)] + 3 * ratio * q[r];
      d[$i(x, y + step)] = d[$i(x, y + step)] + 5 * ratio * q[r];
      d[$i(x + step, y + step)] = d[$i(x + 1, y + step)] + 1 * ratio * q[r];

      d[$i(x + step, y) + 1] = d[$i(x + step, y) + 1] + 7 * ratio * q[g];
      d[$i(x - step, y + step) + 1] = d[$i(x - step, y + step) + 1] + 3 * ratio * q[g];
      d[$i(x, y + step) + 1] = d[$i(x, y + step) + 1] + 5 * ratio * q[g];
      d[$i(x + step, y + step) + 1] = d[$i(x + step, y + step) + 1] + 1 * ratio * q[g];

      d[$i(x + step, y) + 2] = d[$i(x + step, y) + 2] + 7 * ratio * q[b];
      d[$i(x - step, y + step) + 2] = d[$i(x - step, y + step) + 2] + 3 * ratio * q[b];
      d[$i(x, y + step) + 2] = d[$i(x, y + step) + 2] + 5 * ratio * q[b];
      d[$i(x + step, y + step) + 2] = d[$i(x + step, y + step) + 2] + 1 * ratio * q[b];

      out[y][x] = approx;
    }
  }
  return out;
}

export function getColorMatrix(data: ImageData): RGBAColor[][] {
  const res: RGBAColor[][] = [];
  const width = data.width;
  const height = data.height;

  for (let y = 0; y < height; y += 1) {
    const row: RGBAColor[] = [];

    for (let x = 0; x < width; x += 1) {
      row.push(getRgbFromImageData(data, x, y));
    }

    res.push(row);
  }

  return res;
}

export function closestColorMethod(
  imageData: RGBAColor[][],
  palette: RGBAColor[],
  algorithm: IColorDistance,
  ranges: number[],
  dithering: boolean,
  useLuminance: boolean
) {
  const width = imageData[0].length;
  const height = imageData.length;
  let noise: RGBAColor[][] = [];
  const res: RGBAColor[][] = [];

  for (let y = 0; y < height; y += 1) {
    const row = [];

    for (let x = 0; x < width; x += 1) {
      let averageColor: RGBAColor = imageData[y][x];

      if (dithering) {
        averageColor = applyDithering(noise, averageColor, x, y);
      }

      const referenceColor: RGBAColor = { ...averageColor };

      const closestColor = useLuminance
        ? palette[getClosesLuminanceColor(referenceColor, ranges)]
        : getClosestColorInThePalette(referenceColor, palette, algorithm);

      row.push(closestColor);

      noise = recordNoise(noise, averageColor, closestColor, x, y, 1);
    }

    res.push(row);
  }

  return res;
}

export async function pixelate(
  cnv: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  method: IMethod,
  algorithm: IColorDistance,
  dithering: boolean,
  useLuminance: boolean,
  ratioDenom: number
) {
  const palette: RGBAColor[] = [
    { name: "Blue", red: 61, green: 129, blue: 246, alpha: 255 },
    { name: "Red", red: 220, green: 66, blue: 47, alpha: 255 },
    { name: "Orange", red: 232, green: 112, blue: 0, alpha: 255 },
    { name: "Yellow", red: 255, green: 235, blue: 59, alpha: 255 },
    { name: "White", red: 230, green: 230, blue: 230, alpha: 255 },
  ];

  const ranges = [0, 91, 121, 151, 180, 255];

  // const palette: RGBColor[] = [
  //   { red: 182, green: 18, blue: 52 },
  //   { red: 0, green: 70, blue: 173 },
  //   { red: 0, green: 155, blue: 72 },
  //   { red: 255, green: 88, blue: 0 },
  //   { red: 255, green: 213, blue: 0 },
  //   { red: 255, green: 255, blue: 255 },
  // ];

  const { height, width } = cnv;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = getColorMatrix(imageData);

  switch (method) {
    case "ERROR_DIFFUSION": {
      return errorDiffusionDither(imageData, palette, algorithm, ratioDenom);
    }
  }

  return closestColorMethod(data, palette, algorithm, ranges, dithering, useLuminance);
}
