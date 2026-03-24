export interface ReconstructionAnalysis {
  valid: boolean;
  moves: string[];
  moveCount: number;
  htm: number;
  stm: number;
  errors: string[];
}

const VALID_MOVES = /^[RLUDFBrludfbMESxyz]w?['2]?$/;

export const MOVE_GROUPS = {
  rotations: ["x", "y", "z", "x'", "y'", "z'", "x2", "y2", "z2"],
  wideMoves: ["Rw", "Lw", "Uw", "Dw", "Fw", "Bw"],
  sliceMoves: ["M", "E", "S", "M'", "E'", "S'", "M2", "E2", "S2"],
};

function calculateHTM(moves: string[]): number {
  return moves.reduce((sum, move) => {
    if (move.includes("2")) return sum + 2;
    return sum + 1;
  }, 0);
}

function calculateSTM(moves: string[]): number {
  return moves.reduce((sum, move) => {
    let cost = move.includes("2") ? 2 : 1;
    if (MOVE_GROUPS.rotations.includes(move)) cost *= 2;
    if (MOVE_GROUPS.sliceMoves.includes(move) && !move.includes("w")) cost *= 2;
    return sum + cost;
  }, 0);
}

export function validateReconstruction(input: string): ReconstructionAnalysis {
  const errors: string[] = [];
  const moves = input.trim().split(/\s+/).filter((m) => m.length > 0);

  moves.forEach((move, idx) => {
    if (!VALID_MOVES.test(move)) {
      errors.push(`Invalid move at position ${idx}: "${move}"`);
    }
  });

  return {
    valid: errors.length === 0,
    moves,
    moveCount: moves.length,
    htm: calculateHTM(moves),
    stm: calculateSTM(moves),
    errors,
  };
}
