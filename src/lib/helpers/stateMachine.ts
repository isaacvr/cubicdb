import type { InputContext } from "@interfaces";

export interface Actor<Context = InputContext> {
  context: Context;
  event: any;
}

export const isSpace = <Context = InputContext>({ event }: Actor<Context>) => {
  return event.code === "Space";
};

export const isEscape = <Context = InputContext>({ event }: Actor<Context>) => {
  return event.code === "Escape";
};

export const notEscape = <Context = InputContext>({ context, event }: Actor<Context>) => {
  return !isEscape({ context, event });
};
