import { Color } from "@classes/Color";
import { noiseSeed, perlin2 } from "./perlin";

export function generateRandomImage(from: string, to: string, W: number, H: number, factor?: number): string {
  let canvas = document.createElement('canvas');
  let ctx = canvas.getContext('2d')!;

  canvas.width = W;
  canvas.height = H;

  let data = ctx.createImageData(W, H);

  const f = factor || 0.001;
  let rgb1 = (new Color(from)).toArray();
  let rgb2 = (new Color(to)).toArray();
  
  noiseSeed(Date.now());

  for (let x = 0; x < W; x += 1) {
    for (let y = 0; y < H; y += 1) {
      let noise = perlin2(x * f, y * f);
      let pos = 4 * (W * y + x);
      for (let k = 0; k < 3; k += 1) {
        data.data[ pos + k ] = rgb1[k] * (1 - noise) + rgb2[k] * noise;
      }
      data.data[ pos + 3 ] = 255;
    }
  }

  ctx.putImageData(data, 0, 0);

  return canvas.toDataURL();
}

export function updateBackground(from: string, to: string) {
  const W = window.screen.width * 1.5;
  const H = window.screen.height * 1.5;
  let res = generateRandomImage(from, to, W, H);
  document.body.style.backgroundImage = "url(" + res + ")";
}