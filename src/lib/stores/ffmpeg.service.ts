import { FFmpeg } from "@ffmpeg/ffmpeg";
import { randomUUID } from "@helpers/strings";

const ffmpegCore = "/assets/ffmpeg/ffmpeg-core.js";
const ffmpegWasm = "/assets/ffmpeg/ffmpeg-core.wasm";

const BASE64_MARKER = ";base64,";

function convertDataURIToBinary(dataURI: string) {
  const base64Index = dataURI.indexOf(BASE64_MARKER) + BASE64_MARKER.length;
  const base64 = dataURI.substring(base64Index);
  const raw = window.atob(base64);
  const rawLength = raw.length;
  const array = new Uint8Array(new ArrayBuffer(rawLength));

  for (let i = 0; i < rawLength; i += 1) {
    array[i] = raw.charCodeAt(i);
  }

  return array;
}

export class FFmpegService {
  private static _instance: FFmpegService;
  private ready: boolean;
  private starting: boolean;
  private ffmpeg: FFmpeg;

  private constructor() {
    this.ready = false;
    this.starting = false;
    this.ffmpeg = new FFmpeg();
  }

  private async init() {
    if (this.ready) {
      return;
    }

    if (this.starting) {
      return new Promise(res => {
        const itv = setInterval(() => {
          if (this.ready) {
            clearInterval(itv);
            res(null);
          }
        }, 200);
      });
    }

    await this.ffmpeg.load({
      coreURL: ffmpegCore,
      wasmURL: ffmpegWasm,
    });

    this.starting = false;
    this.ready = true;
  }

  static getInstance() {
    if (FFmpegService._instance) return FFmpegService._instance;
    return (FFmpegService._instance = new FFmpegService());
  }

  async generateVideo(
    images: string[],
    FPS: number
  ): Promise<{ result: string; data: ArrayBuffer } | null> {
    await this.init();

    try {
      const len = images.length.toString().length;
      const pref = "0".repeat(len);
      const imageID = randomUUID();

      for (let i = 0, maxi = images.length; i < maxi; i += 1) {
        await this.ffmpeg.writeFile(
          `image_${imageID}_${(pref + (i + 1)).slice(-len)}.png`,
          convertDataURIToBinary(images[i])
        );
      }

      const fileName = `output-${randomUUID()}.mp4`;

      await this.ffmpeg.exec([
        "-framerate",
        FPS.toString(),
        "-start_number",
        "1",
        "-i",
        `image_${imageID}_%0${len}d.png`,
        "-pix_fmt",
        "yuv420p",
        "-preset",
        "ultrafast",
        "-b:v",
        "1M",
        fileName,
      ]);

      const data = await this.ffmpeg.readFile(fileName);

      const blob = new Blob([data], { type: "video/mp4" });

      const res = URL.createObjectURL(blob);

      await this.ffmpeg.deleteFile(fileName);

      return { result: res, data: await blob.arrayBuffer() };
    } catch (err) {
      console.log("ERROR: ", err);
    }

    return null;
  }
}
