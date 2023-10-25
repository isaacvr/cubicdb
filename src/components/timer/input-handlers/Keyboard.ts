import { get, writable, type Writable } from 'svelte/store';
import { isEscape, isSpace } from '@helpers/stateMachine';
import { TimerState, type InputContext, type TimerInputHandler, Penalty, type Solve, type KeyboardContext } from '@interfaces';
import { createMachine, interpret, type Sender } from 'xstate';

const clear = ({ state, time, decimals, currentStep, stepsTime }: KeyboardContext) => {
  state.set(TimerState.CLEAN);
  time.set(0);
  decimals.set(true);
  stepsTime.set([]);
}

const checkPrevention = ({ session, state }: KeyboardContext, snd: Sender<any>) => {
  state.set(TimerState.PREVENTION);
  get(session).settings.withoutPrevention && snd('READY');
}

const setTimerInspection = ({ time, lastSolve, session, addSolve, state, ready, decimals }: KeyboardContext, snd: Sender<any>) => {
  state.set(TimerState.INSPECTION);
  ready.set(false);
  decimals.set(false);
  
  let { settings } = get(session);

  if ( !settings.hasInspection ) {
    return snd('RUN');
  }

  let ref = performance.now() + (settings.hasInspection ? (settings.inspection || 15) * 1000 : 0);
  let ls = get(lastSolve) as Solve;

  let itv = setInterval(() => {
    let t = Math.round((ref - performance.now()) / 1000) * 1000;

    if (t < -2000) {
      snd('DNF');
      lastSolve.set( Object.assign(ls, { penalty: Penalty.DNF }) );
      addSolve(Infinity, Penalty.DNF);
      return;
    }

    if (t <= 0 && ls?.penalty === Penalty.NONE) {
      lastSolve.set( Object.assign(ls, { penalty: Penalty.P2 }) );
    }

    time.set(~~t);
  });

  return () => { clearInterval(itv); };
}

const setTimerRunner = ({ decimals, time, lastSolve, state, timeRef, currentStep, stepsTime }: KeyboardContext) => {
  decimals.set(true);
  state.set(TimerState.RUNNING);
  currentStep.set(1);
  stepsTime.set([]);

  let ref = performance.now() - ( get( lastSolve )?.penalty === Penalty.P2 ? 2000: 0 );
  let itv = setInterval(() => time.set(performance.now() - ref));

  timeRef.set(ref);

  return () => {
    let p = performance.now();
    clearInterval(itv);
    time.set(p - ref);
  };
}

const saveSolve = ({ time, state, lastSolve, stepsTime, timeRef, session, addSolve, initScrambler }: KeyboardContext) => {
  state.set(TimerState.STOPPED);
  initScrambler();
  
  let type = get(session).settings.sessionType;
  let t = get(time);
  let ls = get(lastSolve) as Solve;
  let ref = get(timeRef);
  let steps = get(stepsTime).map(tm => tm - ref );

  steps.push( t );

  for (let i = 1, s = steps[0], maxi = steps.length; i < maxi; i += 1) {
    let sp = steps[i];
    steps[i] -= s;
    s = sp;
  }

  if ( type === 'multi-step' ) {
    ls.steps = steps;
  }

  console.log("STEPS: ", steps, t );
  t > 0 && addSolve(t, ls?.penalty);
  time.set(0);
}

const endedSteps = ({ steps, currentStep, stepsTime }: KeyboardContext, ev: any) => {
  console.log('[endedSteps]: ', get(steps), get(currentStep) );

  if ( get(steps) === get(currentStep) ) {
    return true;
  }

  currentStep.set( get(currentStep) + 1 );
  stepsTime.set( [ ...get(stepsTime), performance.now() ] );

  return false;
};

const KeyboardMachine = createMachine<KeyboardContext>({
  predictableActionArguments: true,
  initial: 'CLEAR',
  states: {
    CLEAR: {
      entry: 'clear',
      on: {
        keydown: {
          target: 'PREVENTION',
          cond: 'isSpace'
        }
      }
    },

    PREVENTION: {
      invoke: {
        src: (ctx) => (cb) => checkPrevention(ctx, cb),
      },
      on: {
        keyup: 'CLEAR',
        READY: 'READY'
      },

      after: {
        "200": {
          target: "READY",
        }
      }
    },

    READY: {
      entry: ({ ready, createNewSolve }) => {
        ready.set(true);
        createNewSolve();
      },
      on: {
        keyup: {
          target: "INSPECTION",
          cond: "isSpace"
        }
      }
    },

    INSPECTION: {
      invoke: {
        src: (ctx) => (cb) => setTimerInspection(ctx, cb)
      },
      on: {
        keyup: {
          target: "RUNNING",
          cond: "isSpace",
        },

        keydown: {
          target: "CLEAR",
          cond: "isEscape",
        },

        DNF: 'STOPPED',
        RUN: 'RUNNING',
      }
    },

    RUNNING: {
      invoke: {
        src: (ctx) => () => setTimerRunner(ctx),
      },
      on: {
        keydown: [
          {
            target: "CLEAR",
            cond: "isEscape"
          }, {
            target: "STOPPED",
            cond: "endedSteps",
          }
        ]
      }
    },

    STOPPED: {
      invoke: {
        src: (ctx) => () => saveSolve(ctx)
      },
      on: {
        keydown: [{
          target: "CLEAR",
          cond: "isEscape",
        }, {
          target: 'PREVENTION',
          cond: 'isSpace'
        }]
      }
    }
  }
}, {
  guards: {
    isSpace,
    isEscape,
    endedSteps,
  },
  actions: {
    clear
  }
});

export class KeyboardInput implements TimerInputHandler {
  isActive: boolean;
  interpreter;

  constructor(context: InputContext) {
    let ctx: KeyboardContext = {
      steps: writable(get(context.session).settings.steps || 1),
      stepsTime: writable([]),
      currentStep: writable(1),
      timeRef: writable(0),
      ...context
    };

    this.interpreter = interpret(KeyboardMachine.withContext(ctx));
    this.isActive = false;
  }

  init() {
    this.isActive = true;
    this.interpreter.start()
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
    this.interpreter.send({ type: 'keydown', code: 'Escape' });
  }
}