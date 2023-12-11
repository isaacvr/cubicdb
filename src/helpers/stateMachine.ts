import type { InputContext } from "@interfaces";

export const isSpace = <Context = InputContext>(_: Context, ev: any) => {
  return ev.code === 'Space';
};

export const isEscape = <Context = InputContext>(_: Context, ev: any) => {
  return ev.code === 'Escape';
};

export const notEscape = <Context = InputContext>(_: Context, ev: any) => {
  return !isEscape(_, ev);
};