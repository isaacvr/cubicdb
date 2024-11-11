import { Puzzle } from "@classes/puzzle/puzzle";
import { sha1 } from "object-hash";
import { planView } from "@workers/imageGenerators/plainView";
import { projectedView } from "@workers/imageGenerators/projectedView";
import { transView } from "@workers/imageGenerators/transView";
import { PRINTABLE_PALETTE } from "@constants";
import { roundCorners } from "@classes/puzzle/puzzleUtils";
import { birdView } from "@workers/imageGenerators/birdView";
import { WebGLRenderer } from "three";
import { browser } from "$app/environment";
import { get } from "svelte/store";
import { dataService } from "$lib/data-services/data.service";

export async function pGenerateCubeBundle(
  cubes: Puzzle[],
  width?: number,
  inCube = false,
  printable = false,
  cache = false,
  format: "raster" | "svg" = "svg"
): Promise<string[]> {
  if (!browser) {
    return cubes.map(() => "");
  }

  // Cache or views
  let images = await get(dataService).cache.cacheGetImageBundle(cubes.map(c => sha1(c.options)));

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

      if (["plan", "2d", "bird"].indexOf(cube.view) > -1) {
        cube.img =
          cube.view === "plan"
            ? planView(cube, W, format)
            : cube.view === "2d"
              ? projectedView(cube, W, format)
              : birdView(cube, W, format);
        cache && get(dataService).cache.cacheSaveImage(sha1(cube.options), cube.img);
      } else {
        if (cube.options.rounded) {
          roundCorners({ p: cube.p, ...cube.p.roundParams });
        }
        cube.img = await transView(renderer, cv, cube, W);
        cache && get(dataService).cache.cacheSaveImage(sha1(cube.options), cube.img);
      }
    }
  }

  renderer.domElement.remove();
  renderer.dispose();
  renderer.forceContextLoss();

  if (inCube) return [];
  return cubes.map(c => c.img);
}
