import { FaceSticker } from "@classes/puzzle/FaceSticker";
import { ImageSticker } from "@classes/puzzle/ImageSticker";
import type { Sticker } from "@classes/puzzle/Sticker";
import type { Puzzle } from "@classes/puzzle/puzzle";
import { roundCorners } from "@classes/puzzle/puzzleUtils";
import { CubeMode } from "@constants";
import {
  BufferGeometry,
  Mesh,
  Object3D,
  BufferAttribute,
  type Side,
  MeshStandardMaterial,
  DoubleSide,
} from "three";
import { loadImageToPiece } from "./loadImageToPiece";
import { TextSticker } from "@classes/puzzle/TextSticker";
import { loadTextSticker } from "./loadTextSticker";

export function piecesToTree(
  cube: Puzzle,
  F: number = 1,
  sTrans: Function = (s: Sticker[]) => s,
  side: Side = DoubleSide
) {
  const group = new Object3D();
  const pieces = cube.pieces;
  const meshes: Mesh[] = [];

  for (let p = 0, maxp = pieces.length; p < maxp; p += 1) {
    const pc = pieces[p];
    const stickers: Sticker[] = sTrans(pc.stickers);
    const piece = new Object3D();

    piece.userData = {
      data: pc,
    };

    pc.anchor.abs() && (piece.userData.anchor = pc.anchor.clone());

    for (let s = 0, maxs = stickers.length; s < maxs; s += 1) {
      const sticker = stickers[s].mul(F);

      if (sticker instanceof ImageSticker) {
        loadImageToPiece(sticker, piece);
        continue;
      }

      if (sticker instanceof TextSticker) {
        loadTextSticker(sticker, piece, cube);
        continue;
      }

      const color = cube.getHexColor(sticker.color);
      const stickerGeometry = new BufferGeometry();
      const vertices: number[] = [];
      const indices: number[] = [];

      sticker.points.forEach(p => vertices.push(p.x, p.y, p.z));

      const stickerMaterial = new MeshStandardMaterial({
        color,
        side,
        ...(color ? { roughness: 0.5, metalness: 0.6 } : {}),
      });

      if (sticker instanceof FaceSticker) {
        const f = sticker.faces;
        for (let i = 0, maxi = f.length; i < maxi; i += 1) {
          indices.push(f[i][0], f[i][1], f[i][2]);
        }
      } else {
        for (let i = 2, maxi = sticker.points.length; i < maxi; i += 1) {
          indices.push(0, i - 1, i);
        }
      }

      stickerGeometry.setIndex(indices);
      stickerGeometry.setAttribute("position", new BufferAttribute(new Float32Array(vertices), 3));
      stickerGeometry.computeVertexNormals();

      const box = new Mesh(stickerGeometry, stickerMaterial);

      box.userData = {
        data: stickers[s],
      };

      piece.add(box);
      meshes.push(box);
    }

    group.add(piece);
  }

  return { group, meshes };
}

export function cubeToThree(cube: Puzzle, F: number = 1) {
  const nc = cube;

  roundCorners({ p: nc.p, ...nc.p.roundParams });

  const defFilter = (s: Sticker[]) => s;
  const rubikFilter = (s: Sticker[]) => {
    return s.filter(
      st =>
        !(
          st.color === "x" ||
          st.oColor === "x" ||
          st._generated.color === "x" ||
          st._generated.oColor === "x"
        )
    );
  };

  const normalMode = [CubeMode.NORMAL, CubeMode.ELL, CubeMode.PLL, CubeMode.ZBLL].some(
    e => e === cube.mode
  );

  const { group, meshes } = piecesToTree(
    nc,
    F,
    cube.type === "rubik" && normalMode ? rubikFilter : defFilter
  );

  group.rotation.x = nc.rotation.x;
  group.rotation.y = nc.rotation.y;
  group.rotation.z = nc.rotation.z;

  return { group, meshes, nc };
}
