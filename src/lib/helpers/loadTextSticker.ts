import { type Object3D, MeshBasicMaterial, Mesh, Matrix4, Vector3 } from "three";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { Font } from "three/examples/jsm/loaders/FontLoader.js";
import type { TextSticker } from "@classes/puzzle/TextSticker";
import type { Puzzle } from "@classes/puzzle/puzzle";
import FONT_URL from "./roboto_regular_numbers.typeface.json?raw";

let font = new Font(JSON.parse(FONT_URL));

export function loadTextSticker(sticker: TextSticker, piece: Object3D, cube: Puzzle) {
  const color = cube.getHexColor(sticker.color);

  const size = 0.5;
  const textGeometry = new TextGeometry(sticker.text, {
    font,
    size,
    depth: 0.006,
    curveSegments: 10,
  });

  const textMaterial = new MeshBasicMaterial({ color });
  const textMesh = new Mesh(textGeometry, textMaterial);
  const pts = sticker.points;
  const _front = sticker.getOrientation();
  const _right = pts[1].add(pts[2]).sub(pts[0].add(pts[3])).div(2);
  const _up = pts[2].add(pts[3]).sub(pts[0].add(pts[1])).div(2);

  const center = sticker
    .updateMassCenter()
    .add(_front.mul(0.01))
    .add(_right.mul(-0.4 * size * sticker.text.length))
    .add(_up.mul(-0.4 * size));

  const front = new Vector3(_front.x, _front.y, _front.z);
  const right = new Vector3(_right.x, _right.y, _right.z);
  const up = new Vector3(_up.x, _up.y, _up.z);

  // Orientar el texto
  const rotationMatrix = new Matrix4().makeBasis(right, up, front);
  textMesh.applyMatrix4(rotationMatrix);

  // Posicionar el texto en el centro del rectángulo
  textMesh.position.copy(center);

  textMesh.userData = {
    data: sticker,
  };

  piece.add(textMesh);
}
