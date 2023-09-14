import type { InputContext } from "@interfaces";

export const isSpace = (_: InputContext, ev: any) => {
  return ev.code === 'Space';
};

export const isEscape = (_: InputContext, ev: any) => {
  return ev.code === 'Escape';
};

export const notEscape = (_: InputContext, ev: any) => {
  return !isEscape(_, ev);
};