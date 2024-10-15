import { Puzzle } from "@classes/puzzle/puzzle";
import type { PuzzleType } from "@interfaces";
import { ThreeJSAdaptor } from "$lib/simulator/adaptors/ThreeJSAdaptor";
import { Mesh, Object3D, Sphere, Vector3, WebGLRenderer } from "three";
import { degToRad } from "three/src/math/MathUtils.js";

function calculateBoundingSphere(object: Object3D) {
  const positions: Vector3[] = [];

  object.traverse(function (child) {
    if (child instanceof Mesh) {
      const geometry = child.geometry;
      const positionAttribute = geometry.attributes.position;
      for (let i = 0, maxi = positionAttribute.count; i < maxi; i += 1) {
        const vertex = new Vector3();
        vertex.fromBufferAttribute(positionAttribute, i);
        vertex.applyMatrix4(child.matrixWorld);
        positions.push(vertex);
      }
    }
  });

  const boundingSphere = new Sphere();
  boundingSphere.setFromPoints(positions);

  return boundingSphere;
}

export async function transView(
  renderer: WebGLRenderer,
  cv: HTMLCanvasElement,
  cube: Puzzle,
  width?: number
): Promise<string> {
  const W = width || 250;
  const F = (["pyraminx", "pyramorphix", "meierHalpernPyramid"] as PuzzleType[]).some(
    t => t === cube.type
  )
    ? 1.3
    : 1;
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
  threeAdaptor.camera.aspect = 1;
  threeAdaptor.camera.near = 2;
  threeAdaptor.camera.far = 20;

  threeAdaptor.cube = cube;

  threeAdaptor.resetScene();

  threeAdaptor.group;

  const sphere = calculateBoundingSphere(threeAdaptor.group);

  // Obtener el centro y el radio del bounding sphere
  // const center = sphere.center;
  const radius = sphere.radius;

  // Calcular la distancia óptima de la cámara desde el objeto
  const distance = radius / F / Math.sin(degToRad(threeAdaptor.camera.fov / 2));

  threeAdaptor.zoom = distance;
  threeAdaptor.resetCamera();

  threeAdaptor.renderScene();

  return cv.toDataURL();
}
