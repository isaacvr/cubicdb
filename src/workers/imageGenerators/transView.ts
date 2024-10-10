import { Puzzle } from "@classes/puzzle/puzzle";
import { cubeToThree } from "@helpers/cubeToThree";
import { ControlAdaptor } from "@pages/Simulator/adaptors/ControlAdaptor";
import { ThreeJSAdaptor } from "@pages/Simulator/adaptors/ThreeJSAdaptor";
import { Material, PerspectiveCamera, Scene, WebGLRenderer } from "three";

export async function transView(
  renderer: WebGLRenderer,
  cv: HTMLCanvasElement,
  cube: Puzzle,
  width?: number
): Promise<string> {
  const W = width || 250;
  cv.width = W;
  cv.height = W;
  renderer.setSize(W, W, false);

  let threeAdaptor = new ThreeJSAdaptor({
    canvas: cv,
    enableDrag: false,
    order: cube.order.a,
    enableKeyboard: false,
    zoom: 8,
    selectedPuzzle: cube.type,
    animationTime: 100,
    showBackFace: false,
    renderer,
  });

  threeAdaptor.camera.fov = 40;
  threeAdaptor.camera.aspect = 0.95;
  threeAdaptor.camera.near = 2;
  threeAdaptor.camera.far = 20;

  threeAdaptor.cube = cube;

  threeAdaptor.resetScene();
  threeAdaptor.resetCamera();
  threeAdaptor.camera.position.set(3, 3, 5.5);

  threeAdaptor.renderScene();

  return cv.toDataURL();
}
