import { TextureLoader, type Object3D, MeshBasicMaterial, Mesh, Face3, Vector3, PlaneGeometry } from "three";
import type { ImageSticker } from "@classes/puzzle/ImageSticker";

export function loadImageToPiece(sticker: ImageSticker, piece: Object3D) {
  const texture = new TextureLoader().load( sticker.url );
  
  let material = new MeshBasicMaterial( { map: texture, transparent: true } );
  let geometry = new PlaneGeometry();
  let up = sticker.getOrientation();
  let mc = sticker.getMassCenter();
  let scale = sticker.scale;

  geometry.lookAt( new Vector3(up.x, up.y, up.z) );
  geometry.scale(scale, scale, scale);
  geometry.translate( mc.x, mc.y, mc.z );

  const mesh = new Mesh(geometry, material);

  mesh.userData = sticker;

  piece.add(mesh);
}