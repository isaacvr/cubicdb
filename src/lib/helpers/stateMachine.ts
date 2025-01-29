import type { InputContext } from "@interfaces";

export interface Actor<Context = InputContext> {
  context: Context;
  event: any;
}

export const isKeyCode =
  (code: string) =>
  <Context = InputContext>({ event }: Actor<Context>) => {
    return event.code === code;
  };

export const isSpace = isKeyCode("Space");
export const isEscape = isKeyCode("Escape");

export const notEscape = <Context = InputContext>({ context, event }: Actor<Context>) => {
  return !isEscape({ context, event });
};
