import { Puzzle } from "@classes/puzzle/puzzle";
import { cubeToThree } from "@helpers/cubeToThree";
import { Material, PerspectiveCamera, Scene, WebGLRenderer } from "three";

export function transView(
  renderer: WebGLRenderer,
  cv: HTMLCanvasElement,
  cube: Puzzle,
  width?: number
): string {
  const W = width || 250;
  cv.width = W;
  cv.height = W;
  renderer.setSize(W, W, false);

  let scene = new Scene();
  let camera = new PerspectiveCamera(40, 0.95, 2, 7);

  camera.position.z = 5.5;

  scene.add(camera);

  let ctt = cubeToThree(cube, cube.type === "megaminx" ? Math.sqrt(7) / 2 : 1);
  scene.add(ctt.group);
  renderer.render(scene, camera);

  // clean up
  scene.children.length = 0;
  ctt.meshes.map(m => (<Material>m.material).dispose());
  ctt.meshes.map(m => m.geometry.dispose());

  return cv.toDataURL();
}
