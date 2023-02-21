import type { Puzzle } from "@classes/puzzle/puzzle";
import { writable, type Writable } from 'svelte/store';

export async function generateCubeBundle(
  cubes: Puzzle[], width ?: number, all ?: boolean, inCube?: boolean, printable?: boolean
): Promise< Writable< string | string[] | null > > {
  let observer = writable<string | string[] | null>('__initial__');

  const SyncWorker = await import('@workers/imageWorker?worker');
  const imageWorker = new SyncWorker.default();
  
  let n = 0;

  imageWorker.onmessage = (e) => {
    if ( !e.data ) {
      console.log('!e.data terminate');
      observer.update(() => null);
      imageWorker.terminate();
    }

    if ( !all && !inCube ) {
      observer.update(() => e.data);
    } else if ( !all && inCube ) {
      cubes[n++].img = e.data;
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

      console.log('ALL_INCUBE: ', all, inCube);
      observer.update(() => e.data);

      if ( n >= cubes.length || all ) {
        console.log('ENDING');
        observer.update(() => null);
        imageWorker.terminate();
      }
    }
  };

  imageWorker.postMessage([cubes.map(c => c.options), width, all, printable]);

  return observer;
}
