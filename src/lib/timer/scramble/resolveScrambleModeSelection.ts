import type { SCRAMBLE_MENU } from '@constants';

export type ScrambleModeSelection = { 0: string; 1: string; 2: number };

export interface ResolveScrambleModeSelectionInput {
  selectedMode: ScrambleModeSelection | null | undefined;
  selectedGroup: number | null | undefined;
  menu: SCRAMBLE_MENU[];
}

export function resolveScrambleModeSelection(
  input: ResolveScrambleModeSelectionInput,
): ScrambleModeSelection | null {
  if (input.selectedMode?.[1]) return input.selectedMode;

  const fallbackGroup = input.selectedGroup ?? 0;
  const fallbackMode = input.menu[fallbackGroup]?.[1]?.[0] ?? input.menu[0]?.[1]?.[0];
  if (!fallbackMode?.[1]) return null;

  return fallbackMode as ScrambleModeSelection;
}
