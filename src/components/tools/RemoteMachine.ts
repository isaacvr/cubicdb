import type { Penalty, Session } from "@interfaces";
import { io } from "socket.io-client";
import { get, writable, type Writable } from "svelte/store";
import { assign, createMachine, interpret, type Sender } from "xstate";
import JSConfetti from 'js-confetti';

let confetti = new JSConfetti();

interface MachineContext {
  leftDown: Writable<boolean>;
  rightDown: Writable<boolean>;
  locked: Writable<boolean>;
  session: Writable<Session | null>;
  time: Writable<number>;
}

type MachineState = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTION_ERROR' | 'CLEAN' | 'STARTING' | 'READY' | 'RUNNING' | 'STOPPED';

// Actions
const handleDown = (ctx: MachineContext, ev: any) => {
  ctx.leftDown.set( ev.hand === 'left' ? true : get(ctx.leftDown) );
  ctx.rightDown.set( ev.hand === 'right' ? true : get(ctx.rightDown) );
};

const handleUp = (ctx: MachineContext, ev: any) => {
  ctx.leftDown.set( ev.hand === 'left' ? false : get(ctx.leftDown) );
  ctx.rightDown.set( ev.hand === 'right' ? false : get(ctx.rightDown) );
  ctx.locked.set(false);
};

const setTimerInspection = ({ session, time }: MachineContext, snd: Sender<any>) => {
  let { settings } = get(session) || { settings: { hasInspection: false } };

  let ref = performance.now() + (settings.hasInspection ? (settings.inspection || 15) * 1000 : 0);
  
  let itv = setInterval(() => {
    let t = Math.round((ref - performance.now()) / 1000) * 1000;

    if (t < -2000) {
      snd('DNF');
      return;
    }

    time.set(~~t);
  });

  return () => { clearInterval(itv); };
}

// Guards
const bothPadsDown = (ctx: MachineContext) => {
  return !get(ctx.locked) && get(ctx.leftDown) && get(ctx.rightDown);
}

const hasInspection = (ctx: MachineContext) => {
  return get(ctx.session)?.settings.hasInspection || false;
}

const machine = createMachine<MachineContext>({
  predictableActionArguments: true,
  initial: 'DISCONNECTED',
  states: {
    DISCONNECTED: {
      entry: ({ session }) => { session.set(null); },
      on: {
        CONNECTING: 'CONNECTING',
        CONNECTED: 'CLEAN',
      }
    },

    CONNECTING: {
      on: {
        CONNECTED: 'CONFIG',
        CONNECTION_ERROR: 'CONNECTION_ERROR',
      }
    },

    CONNECTION_ERROR: {
      on: {
        CONNECT: 'CONNECTING'
      }
    },

    CONFIG: {
      always: [{ target: 'CLEAN', cond: (ctx) => !!get(ctx.session) }]
    },

    CLEAN: {
      entry: ctx => ctx.locked.set(false),
      on: {
        pointerdown: { actions: 'handleDown' },
        pointerup: { actions: 'handleUp' }
      },
      always: [
        { target: 'STARTING', cond: 'bothPadsDown' }
      ]
    },

    STARTING: {
      on: {
        pointerup: {
          actions: 'handleUp',
          target: "CLEAN"
        },
      },
      after: {
        400: {
          target: 'READY'
        }
      }
    },

    READY: {
      on: {
        pointerup: {
          actions: 'handleUp',
          target: 'RUNNING',
        }
      }
    },

    RUNNING: {
      on: {
        reset: 'CLEAN'
      },
      always: [
        { target: 'STOPPED', cond: 'bothPadsDown' }
      ]
    },

    STOPPED: {
      entry: ctx => ctx.locked.set(true),
      on: {
        pointerdown: { actions: 'handleDown' },
        pointerup: { actions: 'handleUp' },
        reset: 'CLEAN',
      }
    },
  },
  on: {
    pointerdown: {
      actions: 'handleDown',
    },
    pointerup: {
      actions: 'handleUp',
    },
    DISCONNECTED: { target: 'DISCONNECTED' },
  }
}, {
  actions: {
    handleDown,
    handleUp
  },
  guards: {
    bothPadsDown
  }
});

export class RemoteMachine {
  private interpreter;
  private socket;
  private session: Writable<Session | null>;
  context: MachineContext;
  state;
  url: string;
  name: string;
  
  constructor() {
    this.session = writable(null);

    this.context = {
      leftDown: writable(false),
      rightDown: writable(false),
      locked: writable(false),
      session: this.session,
      time: writable(0)
    };

    this.state = writable<MachineState>("DISCONNECTED");
    
    
    this.interpreter = interpret(machine.withContext(this.context));

    this.url = 'https://127.0.0.1';
    this.name = '';
    this.socket = io(this.url, { autoConnect: false });
  }

  private initInterpreter() {
    this.interpreter = interpret(machine.withContext(this.context));

    this.interpreter.onTransition((event) => {
      let ev = event.value as MachineState;
      
      if ( ev != get(this.state) ) {
        this.state.set(ev);
        this.socket.emit('message', { type: 'state', state: event.value });
      }
    });
  }

  init() {
    this.disconnect();
    this.initInterpreter();

    this.interpreter.start();
    this.socket = io(this.url, { autoConnect: false });

    this.socket.on('connect', () => {
      this.socket.emit('register', { type: 'timer', name: this.name });
      console.log("CONNECTED");
      this.interpreter.send('CONNECTED');
    });
    
    this.socket.on('disconnect', () => {
      console.log("DISCONNECTED");
      this.interpreter.send('DISCONNECTED');
    });

    this.socket.on('external', (data) => {
      console.log('EXTERNAL DATA', data);

      if ( !data ) return;
      if ( !data.type ) return;

      if ( data.type === 'new-record' ) {
        confetti.addConfetti({
          confettiNumber: 100,
          confettiColors: [ '#009d54', '#3d81f6', '#ffeb3b' ]
        });
      } else if ( data.type === 'session' ) {
        this.session.set(data.value);
        this.interpreter.send('');
      }
    });
  }

  updateUrl(url: string) {
    console.log("UPDATE URL: ", url);
    this.url = url;
    this.init();
    this.interpreter.send('CONNECTING');
    this.socket.connect();
  }

  disconnect() {
    this.socket.disconnect();
    this.socket.offAny();
    this.socket.offAnyOutgoing();
    this.interpreter.stop();
  }

  handleLeft(e: MouseEvent) {
    this.socket.emit('message', { type: e.type, value: 'left' });
    this.interpreter.send(Object.assign(e, { hand: 'left' }));
  }
  
  handleRight(e: MouseEvent) {
    this.socket.emit('message', { type: e.type, value: 'right' });
    this.interpreter.send(Object.assign(e, { hand: 'right' }));
  }

  reset() {
    this.socket.emit('message', { type: 'reset' });
    this.interpreter.send({ type: 'reset' });
  }

  onOff() {
    if ( this.socket.connected ) {
      this.disconnect();
    } else {
      this.init();
      this.socket.connect();
    }
  }

  delete() {
    this.socket.emit('message', { type: 'delete' });
    this.interpreter.send('reset');
  }

  penalty(p: Penalty) {
    this.socket.emit('message', { type: 'penalty', value: p});
  }

  editSolve() {
    this.socket.emit('message', { type: 'edit' });
  }

}