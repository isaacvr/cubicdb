import { Puzzle } from "@classes/puzzle/puzzle";
import { DataService } from "@stores/data.service";
import { sha1 } from "object-hash";
import { clockImage } from "@workers/imageGenerators/clockImage";
import { planView } from "@workers/imageGenerators/plainView";
import { projectedView } from "@workers/imageGenerators/projectedView";
import { transView } from "@workers/imageGenerators/transView";
import { PRINTABLE_PALETTE } from "@constants";
import { roundCorners } from "@classes/puzzle/puzzleUtils";
import { birdView } from "@workers/imageGenerators/birdView";
import { WebGLRenderer } from "three";

async function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise(res => {
    let fr = new FileReader();

    fr.addEventListener("load", () => {
      res(fr.result as string);
    });

    fr.addEventListener("error", () => {
      res("");
    });

    fr.addEventListener("abort", () => {
      res("");
    });

    fr.readAsDataURL(blob);
  });
}

export async function pGenerateCubeBundle(
  cubes: Puzzle[],
  width?: number,
  _all = true,
  inCube = false,
  printable = false,
  cache = false,
  format: "raster" | "svg" = "svg"
): Promise<string[]> {
  return new Promise(async resolve => {
    const dataService = DataService.getInstance();

    // Cache or views
    let images = await dataService.cacheGetImageBundle(cubes.map(c => sha1(c.options)));

    // Prepare for trans view
    let cv = document.createElement("canvas");
    let renderer = new WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
      canvas: cv,
    });

    for (let i = 0, maxi = cubes.length; i < maxi; i += 1) {
      const W = width || 250;

      cubes[i].img = "";

      if (cache && images[i]) {
        cubes[i].img = images[i];
      }

      if (!cubes[i].img) {
        const cube = cubes[i];

        if (printable) cube.p.palette = PRINTABLE_PALETTE;
        if (cube.options.rounded) {
          roundCorners(cube.p, ...cube.p.roundParams);
        }

        if (cube.type === "clock") {
          cube.img = clockImage(cube, 500, format);
          cache && dataService.cacheSaveImage(sha1(cube.options), cube.img);
        } else if (["plan", "2d", "bird"].indexOf(cube.view) > -1) {
          cube.img =
            cube.view === "plan"
              ? planView(cube, W, format)
              : cube.view === "2d"
              ? projectedView(cube, W, format)
              : birdView(cube, W, format);

          cache && dataService.cacheSaveImage(sha1(cube.options), cube.img);
        } else {
          cube.img = await blobToDataURL(await transView(renderer, cv, cube, W));
          cache && dataService.cacheSaveImage(sha1(cube.options), cube.img);
        }
      }
    }

    renderer.dispose();

    if (inCube) return resolve([]);
    return resolve(cubes.map(c => c.img));
  });
}
