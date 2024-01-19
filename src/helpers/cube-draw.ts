import { Puzzle } from "@classes/puzzle/puzzle";
import { DataService } from "@stores/data.service";
import { writable, type Writable } from 'svelte/store';
import { sha1 } from 'object-hash';
import { clockImage } from "@workers/imageGenerators/clockImage";
import { planView } from "@workers/imageGenerators/plainView";
import { projectedView } from "@workers/imageGenerators/projectedView";
import { PRINTABLE_PALETTE } from "@constants";
import { roundCorners } from "@classes/puzzle/puzzleUtils";

// import ImageWorker from '@workers/imageWorker?worker';
// const imageWorker = new ImageWorker();
// const imageWorker = new Worker( new URL('/assets/imageWorker.js', import.meta.url) );

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

export async function generateCubeBundle(
  cubes: Puzzle[], width ?: number, all ?: boolean, inCube?: boolean, printable?: boolean, cache?: boolean
): Promise< Writable< string | string[] | null > > {
  let observer = writable<string | string[] | null>('__initial__');

  const dataService = DataService.getInstance();

  const SyncWorker = await import('@workers/imageWorker?worker');
  const imageWorker = new SyncWorker.default();
  // const imageWorker = new ImageWorker();
  
  let n = 0, total = cubes.length, inCache = 0;

  let images = await dataService.cacheGetImageBundle( cubes.map((c) => sha1(c.options)) );

  for (let i = 0, maxi = cubes.length; i < maxi; i += 1) {
    cubes[i].img = '';

    if ( cache && images[i] ) {
      inCache += 1;
      cubes[i].img = images[i]; 
    }
  }
  
  if ( cache && total === inCache ) {
    setTimeout(() => {
      if ( inCube ) return observer.update(() => null);
      
      if ( !all ) {
        cubes.forEach(c => observer.update(() => c.img));
      } else {
        observer.update(() => cubes.map(c => c.img));
      }

      observer.update(() => null);
    }, 10);
    return observer;
  }

  imageWorker.onmessage = (e) => {
    if ( !e.data ) {
      observer.update(() => null);
      imageWorker.terminate();
    }

    if ( !all && !inCube ) {
      observer.update(() => e.data);
    } else if ( !all && inCube ) {
      cubes[n].img = e.data;

      if ( n >= cubes.length ) {
        observer.update(() => null);
        imageWorker.terminate();
      }
    } else {
      if ( inCube ) {
        if ( !all ) {
          cubes[n++].img = e.data;
        } else {
          for (let i = 0, maxi = cubes.length; i < maxi; i += 1) {
            cubes[i].img = e.data[i];
          }
        }
      }

      observer.update(() => e.data);

      if ( n >= cubes.length || all ) {
        observer.update(() => null);
        imageWorker.terminate();
      }
    }
  };

  imageWorker.postMessage([cubes.map(c => c.img || c.options), width, all, printable]);

  return observer;
}

export async function pGenerateCubeBundle(
  cubes: Puzzle[], width ?: number, _all ?: boolean, inCube?: boolean, printable?: boolean, cache?: boolean
): Promise< string[] > {
  return new Promise(async (resolve) => {
    const dataService = DataService.getInstance();
    const SyncWorker = await dataService.SyncWorker;
    const imageWorker = new SyncWorker.default();
    // const imageWorker = new ImageWorker();
    
    let total = cubes.length, inCache = 0;
    let all = true;
  
    let images = await dataService.cacheGetImageBundle( cubes.map((c) => sha1(c.options)) );
  
    /// Cache or easy views
    for (let i = 0, maxi = cubes.length; i < maxi; i += 1) {
      const W = width || 250;

      cubes[i].img = '';
  
      if ( cache && images[i] ) {
        inCache += 1;
        cubes[i].img = images[i];
      }

      if ( !cubes[i].img && (cubes[i].type === 'clock' || [ 'plan', '2d' ].indexOf(cubes[i].view) > -1) ) {
        const opt = cubes[i].options;
        const cube = Puzzle.fromSequence(opt.sequence || '', opt);
    
        if ( printable ) cube.p.palette = PRINTABLE_PALETTE;
        if ( opt.rounded ) {
          roundCorners(cube.p, ...cube.p.roundParams);
        }
        
        if ( cube.type === 'clock' ) {
          cubes[i].img = await blobToDataURL(await clockImage(cube, 500));
          cache && dataService.cacheSaveImage(sha1(cubes[i].options), cubes[i].img);
          inCache += 1;
        } else if ( [ 'plan', '2d' ].indexOf(cube.view) > -1 ) {
          cubes[i].img = await blobToDataURL(
            await (cube.view === 'plan' ? planView(cube, W) : projectedView(cube, W))
          );
          cache && dataService.cacheSaveImage(sha1(cubes[i].options), cubes[i].img);
          inCache += 1;
        }
      }
    }
    
    if ( total === inCache ) {
      if ( inCube ) return resolve([]);
      return resolve(cubes.map(c => c.img));
    }

    imageWorker.onmessage = (e) => {
      if ( !e.data ) {
        resolve([]);
        imageWorker.terminate();
        return;
      }

      if ( inCube ) {
        for (let i = 0, maxi = cubes.length; i < maxi; i += 1) {
          cubes[i].img = e.data[i];
        }
      }

      cache && cubes.forEach((c, i) => dataService.cacheSaveImage(sha1(c.options), e.data[i]))

      resolve( e.data );
      imageWorker.terminate();
    };
  
    imageWorker.postMessage([cubes.map(c => c.img || c.options), width, all, printable]);
  });
}