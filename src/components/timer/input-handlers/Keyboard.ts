import { get, writable, type Writable } from "svelte/store";
import { isEscape, isSpace, type Actor } from "@helpers/stateMachine";
import {
  TimerState,
  type InputContext,
  type TimerInputHandler,
  Penalty,
  type Solve,
  type KeyboardContext,
} from "@interfaces";
import { createActor, fromCallback, setup } from "xstate";

type KBActor = (data: Actor<KeyboardContext>) => any;

const clear: KBActor = ({ context: { state, time, decimals, stepsTime } }) => {
  state.set(TimerState.CLEAN);
  time.set(0);
  decimals.set(true);
  stepsTime.set([]);
};

const checkPrevention = fromCallback(
  ({ input: { state, session }, sendBack }: { input: KeyboardContext; sendBack: any }) => {
    state.set(TimerState.PREVENTION);
    get(session).settings.withoutPrevention && sendBack({ type: "READY" });
  }
);

const setTimerInspection = fromCallback(
  ({
    input: { state, session, time, lastSolve, ready, decimals, addSolve },
    sendBack,
  }: {
    input: KeyboardContext;
    sendBack: any;
  }) => {
    state.set(TimerState.INSPECTION);
    ready.set(false);
    decimals.set(false);

    let { settings } = get(session);

    if (!settings.hasInspection) {
      return sendBack({ type: "RUN" });
    }

    let ref = performance.now() + (settings.hasInspection ? (settings.inspection || 15) * 1000 : 0);
    let ls = get(lastSolve) as Solve;

    let itv = setInterval(() => {
      let t = Math.round((ref - performance.now()) / 1000) * 1000;

      if (t < -2000) {
        sendBack({ type: "DNF" });
        lastSolve.set(Object.assign(ls, { penalty: Penalty.DNF }));
        addSolve(Infinity, Penalty.DNF);
        return;
      }

      if (t <= 0 && ls?.penalty === Penalty.NONE) {
        lastSolve.set(Object.assign(ls, { penalty: Penalty.P2 }));
      }

      time.set(~~t);
    });

    return () => {
      clearInterval(itv);
    };
  }
);

const setTimerRunner = fromCallback(
  ({
    input: { decimals, state, currentStep, lastSolve, stepsTime, timeRef, time },
  }: {
    input: KeyboardContext;
  }) => {
    decimals.set(true);
    state.set(TimerState.RUNNING);
    currentStep.set(1);
    stepsTime.set([]);

    let ref = performance.now() - (get(lastSolve)?.penalty === Penalty.P2 ? 2000 : 0);
    let itv = setInterval(() => time.set(performance.now() - ref));

    timeRef.set(ref);

    return () => {
      clearInterval(itv);
    };
  }
);

const saveSolve = fromCallback(
  ({
    input: { state, session, time, lastSolve, timeRef, stepsTime, initScrambler, addSolve },
  }: {
    input: KeyboardContext;
  }) => {
    let p = performance.now();
    time.set(p - get(timeRef));
    state.set(TimerState.STOPPED);
    initScrambler();

    let type = get(session).settings.sessionType;
    let t = get(time);
    let ls = get(lastSolve) as Solve;
    let ref = get(timeRef);
    let steps = get(stepsTime).map(tm => tm - ref);

    steps.push(t);

    for (let i = 1, s = steps[0], maxi = steps.length; i < maxi; i += 1) {
      let sp = steps[i];
      steps[i] -= s;
      s = sp;
    }

    if (type === "multi-step") {
      ls.steps = steps;
    }

    t > 0 && addSolve(t, ls?.penalty);
    time.set(0);
  }
);

const endedSteps: KBActor = ({ context: { steps, currentStep, stepsTime } }) => {
  if (get(steps) === get(currentStep)) {
    return true;
  }

  currentStep.set(get(currentStep) + 1);
  stepsTime.set([...get(stepsTime), performance.now()]);

  return false;
};

const KeyboardMachine = setup({
  types: {
    context: {} as KeyboardContext,
  },
  actors: {
    checkPrevention,
    setTimerInspection,
    setTimerRunner,
    saveSolve,
  },
}).createMachine({
  context: ({ input }) => input as KeyboardContext,
  initial: "CLEAR",
  states: {
    CLEAR: {
      entry: clear,
      on: {
        keydown: {
          target: "PREVENTION",
          guard: isSpace,
        },
      },
    },

    PREVENTION: {
      invoke: {
        src: "checkPrevention",
        input: ({ context }) => context,
      },
      on: {
        keyup: "CLEAR",
        READY: "READY",
      },

      after: {
        "200": {
          target: "READY",
        },
      },
    },

    READY: {
      entry: ({ context: { ready, createNewSolve } }) => {
        ready.set(true);
        createNewSolve();
      },
      on: {
        keyup: {
          target: "INSPECTION",
          guard: isSpace,
        },
      },
    },

    INSPECTION: {
      invoke: {
        src: "setTimerInspection",
        input: ({ context }) => context,
      },
      on: {
        keyup: {
          target: "RUNNING",
          guard: isSpace,
        },

        keydown: {
          target: "CLEAR",
          guard: isEscape,
        },

        DNF: "STOPPED",
        RUN: "RUNNING",
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
          {
            target: "STOPPED",
            guard: endedSteps,
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
          {
            target: "PREVENTION",
            guard: isSpace,
          },
        ],
      },
    },
  },
});

export class KeyboardInput implements TimerInputHandler {
  isActive: boolean;
  interpreter;

  constructor(context: InputContext) {
    let ctx: KeyboardContext = {
      steps: writable(+(get(context.session).settings.steps || "") || 1),
      stepsTime: writable([]),
      currentStep: writable(1),
      timeRef: writable(0),
      ...context,
    };

    this.interpreter = createActor(KeyboardMachine, { input: ctx });
    this.isActive = false;
  }

  init() {
    this.isActive = true;
    this.interpreter.start();
  }

  disconnect() {
    this.isActive = false;
    this.interpreter.stop();
  }

  keyUpHandler(ev: KeyboardEvent) {
    if (!this.isActive) return;
    this.interpreter.send(ev);
  }

  keyDownHandler(ev: KeyboardEvent) {
    if (!this.isActive) return;
    this.interpreter.send(ev);
  }

  stopTimer() {
    this.interpreter.send({ type: "keydown", code: "Escape" });
  }

  newRecord() {}
}
