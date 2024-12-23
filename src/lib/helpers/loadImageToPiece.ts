import {
  TextureLoader,
  type Object3D,
  MeshBasicMaterial,
  Mesh,
  Vector3,
  PlaneGeometry,
} from "three";
import type { ImageSticker } from "@classes/puzzle/ImageSticker";

export function loadImageToPiece(sticker: ImageSticker, piece: Object3D) {
  const texture = new TextureLoader().load(sticker.url);

  const material = new MeshBasicMaterial({ map: texture, transparent: true });
  const geometry = new PlaneGeometry();
  const up = sticker.getOrientation();
  const mc = sticker.getMassCenter();
  const scale = sticker.scale;

  geometry.lookAt(new Vector3(up.x, up.y, up.z));
  geometry.scale(scale, scale, scale);
  geometry.translate(mc.x, mc.y, mc.z);

  const mesh = new Mesh(geometry, material);

  mesh.userData.data = sticker;

  piece.add(mesh);
}
