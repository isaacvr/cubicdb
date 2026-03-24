import { Sticker } from "@classes/puzzle/Sticker";
import { Piece } from "@classes/puzzle/Piece";
import { CENTER, FRONT, RIGHT, UP } from "@classes/vector3d";
import { cmd } from "@helpers/math";

export function getOrtohedron(x: number, y: number, z: number) {
  const x2 = x / 2;
  const y2 = y / 2;
  const z2 = z / 2;

  const f1 = new Sticker([cmd("LUB"), cmd("LUF"), cmd("RUF"), cmd("RUB")]);
  const f2 = new Sticker([cmd("LUB"), cmd("LDB"), cmd("LDF"), cmd("LUF")]);
  const f3 = new Sticker([cmd("LUF"), cmd("LDF"), cmd("RDF"), cmd("RUF")]);

  const pc = new Piece([
    f1,
    f2,
    f3,
    f1.reflect1(CENTER, UP, true),
    f2.reflect1(CENTER, RIGHT, true),
    f3.reflect1(CENTER, FRONT, true),
  ]);

  pc.stickers.forEach(st => {
    st.points.forEach(pt => pt.setCoords(pt.x * x2, pt.y * y2, pt.z * z2));
    st.updateMassCenter();
  });

  pc.updateMassCenter();

  return pc;
}
