import { dataService } from "$lib/data-services/data.service";
import type { IVirtualCubeKeyboardDevice } from "$lib/interfaces/devices.types";
import { isEscape, type Actor } from "@helpers/stateMachine";
import { TimerState, type InputContext, type Solve } from "@interfaces";
import { get, writable, type Writable } from "svelte/store";
import { createActor, setup, fromCallback } from "xstate";

interface VirtualContext extends InputContext {
  timeRef: Writable<number>;
}

type VirtualActor = (data: Actor<VirtualContext>) => any;

const clear: VirtualActor = ({ context: { timerState: state, time, decimals, ready } }) => {
  state.set(TimerState.CLEAN);
  time.set(0);
  decimals.set(true);
  ready.set(false);
};

const setTimerRunner = fromCallback(
  ({
    input: { decimals, timerState: state, time, timeRef, createNewSolve },
  }: {
    input: VirtualContext;
  }) => {
    const ref = performance.now();
    decimals.set(true);
    state.set(TimerState.RUNNING);
    timeRef.set(ref);
    createNewSolve();

    const itv = setInterval(() => time.set(performance.now() - ref));

    return () => {
      clearInterval(itv);
    };
  }
);

const saveSolve = fromCallback(
  ({
    input: {
      timerState: state,
      time,
      lastSolve,
      timeRef,
      keyboardEnabled,
      initScrambler,
      addSolve,
    },
  }: {
    input: VirtualContext;
  }) => {
    const p = performance.now();
    time.set(p - get(timeRef));
    state.set(TimerState.STOPPED);
    initScrambler();

    const t = get(time);
    const ls = get(lastSolve) as Solve;

    t > 0 && addSolve(t, ls?.penalty);
    time.set(0);

    // Prevent keyboard to run after pressing some key + space to stop the timer
    const kbe = get(keyboardEnabled);
    keyboardEnabled.set(false);
    setTimeout(() => keyboardEnabled.set(kbe), 1000);
  }
);

const VirtualMachine = setup({
  types: {
    context: {} as VirtualContext,
  },
  actors: {
    setTimerRunner,
    saveSolve,
  },
}).createMachine({
  context: ({ input }) => input as VirtualContext,
  initial: "CLEAR",
  states: {
    CLEAR: {
      entry: clear,
      on: {
        "move:start": {
          target: "RUNNING",
        },
      },
    },

    RUNNING: {
      invoke: {
        src: "setTimerRunner",
        input: ({ context }) => context,
      },
      on: {
        keydown: [
          {
            target: "CLEAR",
            guard: isEscape,
          },
        ],
        solved: [
          {
            target: "STOPPED",
          },
        ],
      },
    },

    STOPPED: {
      invoke: {
        src: "saveSolve",
        input: ({ context }) => context,
      },
      on: {
        keydown: [
          {
            target: "CLEAR",
            guard: isEscape,
          },
        ],

        "move:start": {
          target: "RUNNING",
        },
      },
    },
  },
});

export class VirtualInput implements IVirtualCubeKeyboardDevice {
  private context: VirtualContext | null;

  enabled = true;
  readonly type = "virtual_cube_keyboard";
  name = "Virtual";
  id = "cubicdb:device:virtual";
  interpreter: ReturnType<typeof createActor> | null;
  isConnected = false;
  keyBindings;

  constructor() {
    this.interpreter = null;
    this.context = null;

    this.keyBindings = {
      // Mano derecha
      I: "R",
      K: "R'",
      // O: "Rw",
      // L: "Rw'",
      J: "U",
      // U: "Uw",
      M: "D'",
      H: "F",
      N: "B'",
      // Y: "M",

      // Mano izquierda
      E: "L'",
      D: "L",
      // W: "Lw'",
      // S: "Lw",
      F: "U'",
      // R: "Uw'",
      C: "D",
      G: "F'",
      V: "B",
      // X: "M'",
    };
  }

  init(context: InputContext) {
    this.context = { ...context, timeRef: writable(0) };
    this.interpreter = createActor(VirtualMachine, { input: this.context });
    this.interpreter.start();
    this.isConnected = true;
  }

  disconnect() {
    this.interpreter?.stop();
    this.isConnected = false;
  }

  private emit(type: string, data: any) {
    get(dataService).emitBluetoothData(type, data);
  }

  keyUpHandler(ev: KeyboardEvent) {}

  keyDownHandler(ev: KeyboardEvent) {
    if (/^Key[A-Z]/.test(ev.code) && !ev.ctrlKey && !ev.shiftKey) {
      const k = ev.code.slice(3);
      if (k in this.keyBindings) {
        this.emit("move", [this.keyBindings[k as keyof typeof this.keyBindings], 100]);
        return;
      }
    }

    this.sendEvent(ev);
  }

  sendEvent(e: { type: string; data?: any }) {
    if (!this.isConnected) return;
    this.interpreter?.send(e);
  }

  stopTimer() {}

  newRecord() {}

  toJSON() {
    return {
      type: this.type,
      id: this.id,
      name: this.name,
    };
  }

  fromJSON(config: Record<string, any>) {
    if (["id", "name"].some(e => !config[e])) return null;
    this.id = config.id;
    this.name = config.name;
  }
}
