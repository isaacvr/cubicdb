import type { Puzzle } from "@classes/puzzle/puzzle";
import { DataService } from "@stores/data.service";
import { writable, type Writable } from 'svelte/store';
import { sha1 } from 'object-hash';

// import ImageWorker from '@workers/imageWorker?worker';
// const imageWorker = new ImageWorker();
// const imageWorker = new Worker( new URL('/assets/imageWorker.js', import.meta.url) );

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
  
    const SyncWorker = await import('@workers/imageWorker?worker');
    const imageWorker = new SyncWorker.default();
    // const imageWorker = new ImageWorker();
    
    let n = 0, total = cubes.length, inCache = 0;
    let all = true;
  
    let images = await dataService.cacheGetImageBundle( cubes.map((c) => sha1(c.options)) );
  
    for (let i = 0, maxi = cubes.length; i < maxi; i += 1) {
      cubes[i].img = '';
  
      if ( cache && images[i] ) {
        inCache += 1;
        cubes[i].img = images[i]; 
      }
    }
    
    if ( cache && total === inCache ) {
      // console.log("Resolve all from cache", total);
      if ( inCube ) return resolve([]);
      return resolve(cubes.map(c => c.img));
    }

    // console.log("image worker: ", imageWorker);

    imageWorker.onmessage = (e) => {
      if ( !e.data ) {
        // console.log("Resolve []");
        resolve([]);
        imageWorker.terminate();
        return;
      }

      if ( inCube ) {
        for (let i = 0, maxi = cubes.length; i < maxi; i += 1) {
          cubes[i].img = e.data[i];
        }
      }
      
      // console.log("Resolve data");

      resolve( e.data );
      imageWorker.terminate();
    };
  
    imageWorker.postMessage([cubes.map(c => c.img || c.options), width, all, printable]);
  });
}