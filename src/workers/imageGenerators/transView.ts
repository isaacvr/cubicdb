import { Puzzle } from "@classes/puzzle/puzzle";
import { cubeToThree } from "@helpers/cubeToThree";
import { Geometry, Material, PerspectiveCamera, Scene, WebGLRenderer } from "three";

export async function transView(cube: Puzzle, width ?: number): Promise<Blob> {
  const W = width || 250;
  let cv = document.createElement('canvas');
  cv.width = W;
  cv.height = W;

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
  // console.log("POS: ", camera.position);
  
  scene.add(camera);

  let ctt = cubeToThree(cube, cube.type === 'megaminx' ? Math.sqrt(7) / 2 : 1);
  scene.add(ctt.group);
  renderer.render(scene, camera);

  // clean up
  // scene.remove(ctt.group);
  scene.children.length = 0;
  ctt.meshes.map(m => (<Material> m.material).dispose());
  ctt.meshes.map(m => (<Geometry> m.geometry).dispose());

  return await new Promise((resolve) => cv.toBlob(b => resolve(b || new Blob([])), 'image/jpg'));
}