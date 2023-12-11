import { Puzzle } from "@classes/puzzle/puzzle";
import { roundCorners } from "@classes/puzzle/puzzleUtils";
import { PRINTABLE_PALETTE } from "@constants";
import { cubeToThree } from "@helpers/cubeToThree";
import type { PuzzleOptions } from "@interfaces";
import { Geometry, Material, PerspectiveCamera, Scene, WebGLRenderer } from "three";
import { planView } from "./imageGenerators/plainView";
import { projectedView } from "./imageGenerators/projectedView";
import { clockImage } from "./imageGenerators/clockImage";

// console.log("imgWorker");

interface FileReaderSync {
  readAsArrayBuffer(blob: Blob): ArrayBuffer;
  /** @deprecated */
  readAsBinaryString(blob: Blob): string;
  readAsDataURL(blob: Blob): string;
  readAsText(blob: Blob, encoding?: string): string;
}

declare var FileReaderSync: {
  prototype: FileReaderSync;
  new(): FileReaderSync;
};

async function generateCube(options: (PuzzleOptions | string)[], width ?: number, all ?: boolean, printable ?: boolean) {
  const W = width || 250;

  let f1 = new FileReaderSync();
  let buff = [];

  let cv = new OffscreenCanvas(W, W);

  let renderer = new WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
    canvas: cv,
  });
  
  renderer.setSize(W, W, false);
  
  let scene = new Scene();
  let camera = new PerspectiveCamera(40, 0.95, 2, 7);

  camera.position.z = 5.5;
  
  scene.add(camera);

  for (let i = 0, maxi = options.length; i < maxi; i += 1) {
    const opt = options[i];
    let img = '';

    if ( typeof opt === 'string' ) {
      img = opt;
    } else {
      const cube = Puzzle.fromSequence(opt.sequence || '', opt);
  
      if ( printable ) cube.p.palette = PRINTABLE_PALETTE;
      if ( opt.rounded ) {
        roundCorners(cube.p, ...cube.p.roundParams);
      }

      let res: any;
  
      if ( cube.type === 'clock' ) {
        res = clockImage(cube, 500);
      } else if ( [ 'plan', '2d' ].indexOf(cube.view) > -1 ) {
        res = cube.view === 'plan' ? planView(cube, W) : projectedView(cube, W);
      } else {
        let ctt = cubeToThree(cube, cube.type === 'megaminx' ? Math.sqrt(7) / 2 : 1);
        scene.add(ctt.group);
        renderer.render(scene, camera);
        res = cv.convertToBlob();
  
        // clean up
        // scene.remove(ctt.group);
        scene.children.length = 0;
        ctt.meshes.map(m => (<Material> m.material).dispose());
        ctt.meshes.map(m => (<Geometry> m.geometry).dispose());
      }
      
      img = f1.readAsDataURL(await res);
    }

    all ? buff.push(img) : postMessage(img);
  }

  all && postMessage(buff);

}

onmessage = function(e) {
  const { data } = e;
  generateCube(data[0], data[1], data[2], data[3]);
}

export {};