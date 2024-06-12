import type { Piece } from "@classes/puzzle/Piece";
import type { Sticker } from "@classes/puzzle/Sticker";
import { EPS } from "@constants";

export function nonGray(st: Sticker): boolean {
  return st.color != 'x' && st.color != 'd';
}

export function getColoredStickers(pc: Piece, colorFilter = nonGray): Sticker[] {
  return pc.stickers.filter(colorFilter);
}

export function nonOGray(st: Sticker): boolean {
  return st.oColor != 'x' && st.oColor != 'd';
}

export function getOColoredStickers(pc: Piece, colorFilter = nonOGray): Sticker[] {
  return pc.stickers.filter(colorFilter);
}

export function getColoredFromList(st: Sticker[], colorFilter = nonOGray): Sticker[] {
  return st.filter(colorFilter);
}

export function centerStickerAligned(
  center: Piece,
  st: Sticker,
  ignoreColor = false
): boolean {
  if (/^[xd]$/.test(st.color)) return false;

  let centerSticker = center.stickers.filter(nonGray)[0];
  let o = centerSticker.getOrientation();

  return (
    (ignoreColor ? true : st.color === centerSticker.color) &&
    st.getOrientation().sub(o).abs() < EPS
  );
}

export function pieceInPlace(centers: Piece[], piece: Piece): boolean {
  let edgeStickers = getColoredStickers(piece);
  return edgeStickers.every(st =>
    centers.some(c => centerStickerAligned(c, st))
  );
}

export function pieceInCenter(center: Piece, piece: Piece): boolean {
  let edgeStickers = getColoredStickers(piece);
  return edgeStickers.some(st => centerStickerAligned(center, st, true));
}

export function pieceInCenterColor(center: Piece, piece: Piece): boolean {
  let edgeStickers = getColoredStickers(piece);
  return edgeStickers.some(st => centerStickerAligned(center, st));
}

export function piecesCorrectRelative(pc1: Piece, pc2: Piece): boolean {
  let colors = getColoredStickers(pc1).map(st => st.color);

  if (colors.reduce((acc, e) => acc + (pc2.contains(e) ? 1 : 0), 0) != 2) {
    return false;
  }

  for (let i = 0, maxi = colors.length; i < maxi; i += 1) {
    if (!pc2.contains(colors[i])) continue;

    let v1 = pc1.stickers
      .filter(st => st.color === colors[i])[0]
      .getOrientation();

    let v2 = pc2.stickers
      .filter(st => st.color === colors[i])[0]
      .getOrientation();

    if (v1.sub(v2).abs() > EPS) return false;
  }

  return true;
}
