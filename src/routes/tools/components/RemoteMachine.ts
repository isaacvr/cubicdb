import type { Penalty, Session } from "@interfaces";
import { io } from "socket.io-client";
import { get, writable, type Writable } from "svelte/store";
import { createActor, setup } from "xstate";
import JSConfetti from "js-confetti";

const confetti = new JSConfetti();

interface MachineContext {
  leftDown: Writable<boolean>;
  rightDown: Writable<boolean>;
  locked: Writable<boolean>;
  session: Writable<Session | null>;
  time: Writable<number>;
}
type Actor = ({ context, event }: { context: MachineContext; event: any }) => any;
type MachineState =
  | "DISCONNECTED"
  | "CONNECTING"
  | "CONNECTION_ERROR"
  | "CLEAN"
  | "STARTING"
  | "READY"
  | "RUNNING"
  | "STOPPED";

// Actors
const handleDown: Actor = ({ context, event }) => {
  context.leftDown.set(event.hand === "left" ? true : get(context.leftDown));
  context.rightDown.set(event.hand === "right" ? true : get(context.rightDown));
};

const handleUp: Actor = ({ context, event }) => {
  context.leftDown.set(event.hand === "left" ? false : get(context.leftDown));
  context.rightDown.set(event.hand === "right" ? false : get(context.rightDown));
  context.locked.set(false);
};

// const setTimerInspection = ({ session, time }: MachineContext, snd: Sender<any>) => {
//   let { settings } = get(session) || { settings: { hasInspection: false } };

//   let ref = performance.now() + (settings.hasInspection ? (settings.inspection || 15) * 1000 : 0);

//   let itv = setInterval(() => {
//     let t = Math.round((ref - performance.now()) / 1000) * 1000;

//     if (t < -2000) {
//       snd("DNF");
//       return;
//     }

//     time.set(~~t);
//   });

//   return () => {
//     clearInterval(itv);
//   };
// };

// Guards
const bothPadsDown: Actor = ({ context }) => {
  return !get(context.locked) && get(context.leftDown) && get(context.rightDown);
};

// const hasInspection = (ctx: MachineContext) => {
//   return get(ctx.session)?.settings.hasInspection || false;
// };

const machine = setup({
  types: {
    context: {} as MachineContext,
  },
}).createMachine({
  context: {} as MachineContext,
  initial: "DISCONNECTED",
  states: {
    DISCONNECTED: {
      entry: ({ context: { session } }: { context: MachineContext }) => {
        session.set(null);
      },
      on: {
        CONNECTING: "CONNECTING",
        CONNECTED: "CLEAN",
      },
    },

    CONNECTING: {
      on: {
        CONNECTED: "CONFIG",
        CONNECTION_ERROR: "CONNECTION_ERROR",
      },
    },

    CONNECTION_ERROR: {
      on: {
        CONNECT: "CONNECTING",
      },
    },

    CONFIG: {
      always: [
        {
          target: "CLEAN",
          guard: ({ context }: { context: MachineContext }) => !!get(context.session),
        },
      ],
    },

    CLEAN: {
      entry: ({ context }) => context.locked.set(false),
      on: {
        pointerdown: { actions: handleDown },
        pointerup: { actions: handleUp },
      },
      always: [{ target: "STARTING", guard: bothPadsDown }],
    },

    STARTING: {
      on: {
        pointerup: {
          actions: handleUp,
          target: "CLEAN",
        },
      },
      after: {
        400: {
          target: "READY",
        },
      },
    },

    READY: {
      on: {
        pointerup: {
          actions: handleUp,
          target: "RUNNING",
        },
      },
    },

    RUNNING: {
      on: {
        reset: "CLEAN",
      },
      always: [{ target: "STOPPED", guard: bothPadsDown }],
    },

    STOPPED: {
      entry: ({ context }) => context.locked.set(true),
      on: {
        pointerdown: { actions: handleDown },
        pointerup: { actions: handleUp },
        reset: "CLEAN",
      },
    },
  },
  on: {
    pointerdown: {
      actions: handleDown,
    },
    pointerup: {
      actions: handleUp,
    },
    DISCONNECTED: { target: ".DISCONNECTED" },
  },
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
      time: writable(0),
    };

    this.state = writable<MachineState>("DISCONNECTED");

    this.interpreter = createActor(machine, { input: this.context });

    this.url = "https://127.0.0.1";
    this.name = "";
    this.socket = io(this.url, { autoConnect: false });
  }

  private initInterpreter() {
    this.interpreter = createActor(machine, { input: this.context });

    this.interpreter.subscribe(event => {
      const ev = event.value as MachineState;

      if (ev != get(this.state)) {
        this.state.set(ev);
        this.socket.emit("message", { type: "state", state: event.value });
      }
    });
  }

  init() {
    this.disconnect();
    this.initInterpreter();

    this.interpreter.start();
    this.socket = io(this.url, { autoConnect: false });

    this.socket.on("connect", () => {
      this.socket.emit("register", { type: "timer", name: this.name });
      console.log("CONNECTED");
      this.interpreter.send({ type: "CONNECTED" });
    });

    this.socket.on("disconnect", () => {
      console.log("DISCONNECTED");
      this.interpreter.send({ type: "DISCONNECTED" });
    });

    this.socket.on("external", data => {
      console.log("EXTERNAL DATA", data);

      if (!data) return;
      if (!data.type) return;

      if (data.type === "new-record") {
        confetti.addConfetti({
          confettiNumber: 100,
          confettiColors: ["#009d54", "#3d81f6", "#ffeb3b"],
        });
      } else if (data.type === "session") {
        this.session.set(data.value);
        this.interpreter.send({ type: "" });
      }
    });
  }

  updateUrl(url: string) {
    console.log("UPDATE URL: ", url);
    this.url = url;
    this.init();
    this.interpreter.send({ type: "CONNECTING" });
    this.socket.connect();
  }

  disconnect() {
    this.socket.disconnect();
    this.socket.offAny();
    this.socket.offAnyOutgoing();
    this.interpreter.stop();
  }

  handleLeft(e: MouseEvent) {
    this.socket.emit("message", { type: e.type, value: "left" });
    this.interpreter.send(Object.assign(e, { hand: "left" }));
  }

  handleRight(e: MouseEvent) {
    this.socket.emit("message", { type: e.type, value: "right" });
    this.interpreter.send(Object.assign(e, { hand: "right" }));
  }

  reset() {
    this.socket.emit("message", { type: "reset" });
    this.interpreter.send({ type: "reset" });
  }

  onOff() {
    if (this.socket.connected) {
      this.disconnect();
    } else {
      this.init();
      this.socket.connect();
    }
  }

  delete() {
    this.socket.emit("message", { type: "delete" });
    this.interpreter.send({ type: "reset" });
  }

  penalty(p: Penalty) {
    this.socket.emit("message", { type: "penalty", value: p });
  }

  editSolve() {
    this.socket.emit("message", { type: "edit" });
  }
}
