import * as THREE from 'three';
import type { Puzzle } from "@classes/puzzle/puzzle";
import { FaceSticker } from '@classes/puzzle/FaceSticker';
import { writable, type Writable } from 'svelte/store';
import { roundCorners } from '@classes/puzzle/puzzleUtils';

export function cubeToThree(cube: Puzzle, F: number = 1) {
  let nc = cube;
  roundCorners(nc.p, ...nc.p.roundParams);
  
  let group = new THREE.Object3D();
  let pieces = nc.pieces;
  let meshes: THREE.Mesh[] = [];

  for (let p = 0, maxp = pieces.length; p < maxp; p += 1) {
    let stickers = pieces[p].stickers;
    let piece = new THREE.Object3D();

    piece.userData = pieces[p];

    for (let s = 0, maxs = stickers.length; s < maxs; s += 1) {
      let sticker = stickers[s].mul(F); 
      let color = nc.getHexColor( sticker.color );
      let stickerGeometry = new THREE.Geometry(); 
      let stickerMaterial: THREE.Material;

      stickerGeometry.vertices.push( ...sticker.points.map(p => new THREE.Vector3(p.x, p.y, p.z)) );

      if ( sticker instanceof FaceSticker ) {
        stickerMaterial = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          side: THREE.DoubleSide,
          vertexColors: true
        });

        let f = sticker.faces;
        for (let i = 0, maxi = f.length; i < maxi; i += 1) {
          let face = new THREE.Face3(f[i][0], f[i][1], f[i][2], null);
          face.color.setHex( color );
          stickerGeometry.faces.push(face);
        }
        stickerGeometry.colorsNeedUpdate = true;
      } else {
        stickerMaterial = new THREE.MeshBasicMaterial({
          color,
          side: THREE.DoubleSide
        });

        for (let i = 2, maxi = sticker.points.length; i < maxi; i += 1) {
          stickerGeometry.faces.push( new THREE.Face3(0, i - 1, i) );
        }
      }

      let box = new THREE.Mesh(stickerGeometry, stickerMaterial);
      box.userData = stickers[s];
      
      piece.add(box);
      meshes.push(box);

    }

    group.add(piece);
    
  }

  group.rotation.x = nc.rotation.x;
  group.rotation.y = nc.rotation.y;
  group.rotation.z = nc.rotation.z;

  return {group, meshes, nc};
}

export async function generateCubeBundle(
  cubes: Puzzle[], width ?: number, all ?: boolean, inCube?: boolean
): Promise< Writable< string | string[] > > {
  let observer = writable<string | string[]>('__initial__');

  const SyncWorker = await import('@workers/imageWorker?worker');
  const imageWorker = new SyncWorker.default();
  
  let n = 0;

  imageWorker.onmessage = (e) => {
    if ( !e.data ) return observer.update(() => null);

    if ( !all && inCube ) {
      cubes[n++].img = e.data;
      if ( n >= cubes.length ) observer.update(() => null);
    } else {
      observer.update(() => e.data);
    }
  };

  imageWorker.postMessage([cubes.map(c => c.options), width, all]);

  return observer;
}
