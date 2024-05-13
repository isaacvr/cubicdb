import { Puzzle } from "@classes/puzzle/puzzle";
import { DataService } from "@stores/data.service";
import { writable, type Writable } from 'svelte/store';
import { sha1 } from 'object-hash';
import { clockImage } from "@workers/imageGenerators/clockImage";
import { planView } from "@workers/imageGenerators/plainView";
import { projectedView } from "@workers/imageGenerators/projectedView";
import { transView } from "@workers/imageGenerators/transView";
import { PRINTABLE_PALETTE } from "@constants";
import { roundCorners } from "@classes/puzzle/puzzleUtils";

async function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise(res => {
    let fr = new FileReader;

    fr.addEventListener('load', () => {
      res(fr.result as string);
    });

    fr.addEventListener('error', () => {
      res('');
    });

    fr.addEventListener('abort', () => {
      res('');
    });
    
    fr.readAsDataURL(blob);
  });
}

export async function pGenerateCubeBundle(
  cubes: Puzzle[], width ?: number, _all = true, inCube = false, printable = false, cache = false
): Promise< string[] > {
  return new Promise(async (resolve) => {
    const dataService = DataService.getInstance();
  
    // Cache or views
    let images = await dataService.cacheGetImageBundle( cubes.map((c) => sha1(c.options)) );

    for (let i = 0, maxi = cubes.length; i < maxi; i += 1) {
      const W = width || 250;

      cubes[i].img = '';
  
      if ( cache && images[i] ) {
        cubes[i].img = images[i];
      }

      if ( !cubes[i].img ) {
        const opt = cubes[i].options;
        // const cube = cubes[i].clone();
        const cube = Puzzle.fromSequence(opt.sequence || '', opt);
    
        if ( printable ) cube.p.palette = PRINTABLE_PALETTE;
        if ( opt.rounded ) {
          roundCorners(cube.p, ...cube.p.roundParams);
        }
        
        if ( cube.type === 'clock' ) {
          cubes[i].img = await blobToDataURL(await clockImage(cube, 500));
          cache && dataService.cacheSaveImage(sha1(cubes[i].options), cubes[i].img);
        } else if ( [ 'plan', '2d' ].indexOf(cube.view) > -1 ) {
          cubes[i].img = await blobToDataURL(
            await (cube.view === 'plan' ? planView(cube, W) : projectedView(cube, W))
          );
          cache && dataService.cacheSaveImage(sha1(cubes[i].options), cubes[i].img);
        } else {
          cubes[i].img = await blobToDataURL( await transView(cube, W) );
          cache && dataService.cacheSaveImage(sha1(cubes[i].options), cubes[i].img);
        }
      }
    }
    
    if ( inCube ) return resolve([]);
    return resolve(cubes.map(c => c.img));
  });
}