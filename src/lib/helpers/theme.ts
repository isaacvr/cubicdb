import { Color } from "@classes/Color";
import { noiseSeed, perlin2 } from "./perlin";

export function generateRandomImage(
  from: string,
  to: string,
  W: number,
  H: number,
  factor?: number
): string {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  canvas.width = W;
  canvas.height = H;

  const data = ctx.createImageData(W, H);

  const f = factor || 0.002;
  const rgb1 = new Color(from).toArray();
  const rgb2 = new Color(to).toArray();

  noiseSeed(Date.now());

  for (let x = 0; x < W; x += 1) {
    for (let y = 0; y < H; y += 1) {
      const noise = perlin2(x * f, y * f);
      const pos = 4 * (W * y + x);
      for (let k = 0; k < 3; k += 1) {
        data.data[pos + k] = rgb1[k] * (1 - noise) + rgb2[k] * noise;
      }
      data.data[pos + 3] = 255;
    }
  }

  ctx.putImageData(data, 0, 0);

  return canvas.toDataURL();
}

export function updateBackground(from: string, to: string, factor = 0.001) {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const res = generateRandomImage(from, to, W, H, factor);
  document.body.style.backgroundImage = "url(" + res + ")";
}
