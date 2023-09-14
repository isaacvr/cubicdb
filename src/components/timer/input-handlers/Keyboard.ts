import { get } from 'svelte/store';
import { isEscape, isSpace, notEscape } from '@helpers/stateMachine';
import { TimerState, type InputContext, type TimerInputHandler, Penalty, type Solve } from '@interfaces';
import { createMachine, interpret, type Sender } from 'xstate';

const clear = ({ state, time, decimals }: InputContext) => {
  state.set(TimerState.CLEAN);
  time.set(0);
  decimals.set(true);
}

const checkPrevention = ({ session, state }: InputContext, snd: Sender<any>) => {
  state.set(TimerState.PREVENTION);
  get(session).settings.withoutPrevention && snd('READY');
}

const setTimerInspection = ({ time, lastSolve, session, addSolve, state, ready, decimals }: InputContext, snd: Sender<any>) => {
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

const setTimerRunner = ({ decimals, time, lastSolve, state }: InputContext) => {
  decimals.set(true);
  state.set(TimerState.RUNNING);

  let ref = performance.now() - ( get( lastSolve )?.penalty === Penalty.P2 ? 2000: 0 );
  let itv = setInterval(() => time.set(performance.now() - ref));
  return () => clearInterval(itv);
}

const saveSolve = ({ time, state, lastSolve, addSolve }: InputContext) => {
  state.set(TimerState.STOPPED);
  
  let t = get(time);
  let ls = get(lastSolve);

  t > 0 && addSolve(t, ls?.penalty);
  time.set(0);
}

const KeyboardMachine = createMachine<InputContext, any>({
  predictableActionArguments: true,
  initial: 'CLEAR',
  states: {
    CLEAR: {
      entry: ['clear'],
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
        keydown: [{
          target: "CLEAR",
          cond: "isEscape"
        }, {
          target: "STOPPED",
          cond: "notEscape",
        }]
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
    notEscape,
  },
  actions: {
    clear
  }
});

export class KeyboardInput implements TimerInputHandler {
  isActive: boolean;
  interpreter;

  constructor(context: InputContext) {
    this.interpreter = interpret(KeyboardMachine.withContext(context));

    this.interpreter.onTransition((st) => {
      console.log("STATE: ", st.value);
    });

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