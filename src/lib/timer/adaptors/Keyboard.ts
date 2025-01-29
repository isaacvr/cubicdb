import { get, writable, type Writable } from "svelte/store";
import { isEscape, isKeyCode, isSpace, type Actor } from "@helpers/stateMachine";
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

const clear: KBActor = ({ context: { timerState: state, time, decimals, stepsTime, ready } }) => {
  state.set(TimerState.CLEAN);
  time.set(0);
  decimals.set(true);
  stepsTime.set([]);
  ready.set(false);
};

const checkPrevention = fromCallback(
  ({
    input: { timerState: state, session },
    sendBack,
  }: {
    input: KeyboardContext;
    sendBack: any;
  }) => {
    state.set(TimerState.PREVENTION);
    get(session).settings.withoutPrevention && sendBack({ type: "READY" });
  }
);

const setTimerInspection = fromCallback(
  ({
    input: { timerState: state, session, time, lastSolve, ready, decimals, addSolve },
    sendBack,
  }: {
    input: KeyboardContext;
    sendBack: any;
  }) => {
    state.set(TimerState.INSPECTION);
    ready.set(false);
    decimals.set(false);

    const { settings } = get(session);

    if (!settings.hasInspection) {
      return sendBack({ type: "RUN" });
    }

    const ref =
      performance.now() + (settings.hasInspection ? (settings.inspection || 15) * 1000 : 0);
    const ls = get(lastSolve) as Solve;

    const itv = setInterval(() => {
      const t = Math.round((ref - performance.now()) / 1000) * 1000;

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
    input: { decimals, timerState: state, currentStep, lastSolve, stepsTime, timeRef, time },
  }: {
    input: KeyboardContext;
  }) => {
    const ref =
      get(state) === TimerState.PAUSE
        ? performance.now() - get(time)
        : performance.now() - (get(lastSolve)?.penalty === Penalty.P2 ? 2000 : 0);

    const itv = setInterval(() => time.set(performance.now() - ref));

    if (get(state) !== TimerState.PAUSE) {
      currentStep.set(1);
      stepsTime.set([]);
    }

    decimals.set(true);
    state.set(TimerState.RUNNING);
    timeRef.set(ref);

    return () => {
      clearInterval(itv);
    };
  }
);

const saveSolve = fromCallback(
  ({
    input: {
      timerState: state,
      session,
      time,
      lastSolve,
      timeRef,
      stepsTime,
      keyboardEnabled,
      initScrambler,
      addSolve,
    },
  }: {
    input: KeyboardContext;
  }) => {
    state.set(TimerState.STOPPED);

    initScrambler();

    const type = get(session).settings.sessionType;
    const t = get(time);
    const ls = get(lastSolve) as Solve;
    const ref = get(timeRef);
    const steps = get(stepsTime).map(tm => tm - ref);

    steps.push(t);

    for (let i = 1, s = steps[0], maxi = steps.length; i < maxi; i += 1) {
      const sp = steps[i];
      steps[i] -= s;
      s = sp;
    }

    if (type === "multi-step") {
      ls.steps = steps;
    }

    t > 0 && setTimeout(() => addSolve(t, ls?.penalty), 100);

    // Prevent keyboard to run after pressing some key + space to stop the timer
    const kbe = get(keyboardEnabled);
    keyboardEnabled.set(false);
    setTimeout(() => keyboardEnabled.set(kbe), 1000);
  }
);

const endedSteps: KBActor = ({ context: { steps, currentStep, stepsTime } }) => {
  if (get(steps) === get(currentStep)) {
    return true;
  }

  currentStep.update(e => e + 1);
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
        keydown: {
          target: "CLEAR",
          guard: isEscape,
        },
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
        keydown: {
          target: "CLEAR",
          guard: isEscape,
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
            target: "PAUSE",
            guard: isKeyCode("KeyP"),
          },
          {
            target: "STOPPED",
            guard: endedSteps,
          },
        ],
      },
    },

    PAUSE: {
      entry: ({ context: { timerState } }) => timerState.set(TimerState.PAUSE),
      on: {
        keydown: [
          {
            target: "CLEAR",
            guard: isEscape,
          },
          {
            target: "RUNNING",
            guard: isSpace,
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

  constructor(context: InputContext, currentStep: Writable<number>) {
    const ctx: KeyboardContext = {
      steps: writable(+(get(context.session).settings.steps || "") || 1),
      stepsTime: writable([]),
      currentStep,
      timeRef: writable(0),
      ...context,
    };

    this.interpreter = createActor(KeyboardMachine, { input: ctx });
    this.isActive = false;

    // this.interpreter.subscribe(ev => {
    //   console.log(ev.value);
    // });
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
    if (!this.isActive || !get(this.interpreter.getSnapshot().context.keyboardEnabled)) return;
    this.interpreter.send(ev);
  }

  keyDownHandler(ev: KeyboardEvent) {
    if (!this.isActive || !get(this.interpreter.getSnapshot().context.keyboardEnabled)) return;
    this.interpreter.send(ev);
  }

  stopTimer() {
    this.interpreter.send({ type: "keydown", code: "Escape" });
  }

  newRecord() {}
  sendEvent() {}
}
