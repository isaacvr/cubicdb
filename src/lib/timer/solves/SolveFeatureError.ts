export type SolveOperation = "list" | "add" | "update" | "remove";

export type SolveFeatureError =
  | {
      code: "SOLVE_PERSISTENCE_FAILED";
      operation: SolveOperation;
      message: string;
    }
  | {
      code: "SESSION_SCOPE_MISMATCH";
      operation: "update" | "remove";
      message: string;
    }
  | {
      code: "SOLVE_RESPONSE_MISSING";
      operation: SolveOperation;
      message: string;
    };

export function normalizeSolveFeatureError(
  error: unknown,
  operation: SolveOperation
): SolveFeatureError {
  return {
    code: "SOLVE_PERSISTENCE_FAILED",
    operation,
    message: error instanceof Error ? error.message : String(error),
  };
}
