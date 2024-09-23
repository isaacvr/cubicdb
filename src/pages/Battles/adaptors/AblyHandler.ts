import type { Actor } from "@helpers/stateMachine";
import type { AblyContext, Game } from "@interfaces";
import { createActor, setup } from "xstate";
import {
  createBattle,
  disconnectBattle,
  getSocket,
  joinBattle,
  lookBattle,
  nextRoundBattle,
  startBattle,
  timeBattle,
} from "./BattleAPI";
import { get } from "svelte/store";

type AblyActor = (data: Actor<AblyContext>) => any;
const debug = false;

// Entry
const enterDisconnect: AblyActor = ({ context: { isConnected } }) => {
  debug && console.log("[enterDisconnect]");
  isConnected.set(false);
};

const enterConnect: AblyActor = ({ context: { isConnected } }) => {
  debug && console.log("[enterConnect]");
  isConnected.set(true);
};

// Guards
const isOwner: AblyActor = ({ context: { game, clientID } }) => {
  return get(game).owner === get(clientID);
};

const isPlayer: AblyActor = ({ context: { game, clientID } }) => {
  let _clientID = get(clientID);
  return get(game).players.some(p => p[0] === _clientID);
};

const isObserver: AblyActor = ({ context }) => {
  return true;
};

const GameMachine = setup({
  types: {
    context: {} as AblyContext,
  },
  actors: {},
  guards: {},
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QAoC2BDAxgCwJYDswBKAYgl1kwHt9DMAXSAbQAYBdRUABytl3tw1OIAB6IALACYANCACeiAIyKArAA4AdONWSAzAE5J+3ZMkA2FQF9LstFjyEiG8pRp1GEEtVpgGrDkggPHwCQoFiCLpmuhqK4urx4sZqemqyCgjK6lo6BkYm5lY2IHY4BMQa3u6QJADCAEoAogCCACqN-sLB-IL4whFm4uJaugDsKorG+ipmLKP66UqKo5Ias-pm+ixJeqNq1rYYZY6Vbr4eJABSAPIAkgBynYHdoX3hiIPD4mMTUzNzC3kSzisRY+lGijUhnEZjUKkkBxKRwcFQaLVaDwA4nUmm1GgARJ7cXg9MKgCLGMwaFi6LKTFhqEzxRaZZardabbaGMb7YqlFFOG4PLFXO73AlEoIk179RCU6m01T0xmSZlAhBqBlaNRqRRmcz5OGI-nlQVikVC8X4gD61wAQgBlRr1ABqzslL16soQ8ppdK2KrVGS2w30OrZKhUexpZmNyNNGjRePxJHFAA1Wtb6tcAKr3QnsLrSr3vTJRTRgqK0nm6+EsxQsKMaSThlQsA36cTtuP2BNJ9opjEAWUaudaHuLZNESnL1Mp1b2tZk6t07Y0+j1KxmowhuikPeOqNxA9TjQzWdz+etzRdzVuABlmnb7x1C89J29yTPYXOq4oazoLIQiosRmGYO5tio4hwtsB4Comx4EiQmLNCO1r4m0zQTiEJZfmWP6VtE-6LoB6obCwGgkV2uh7vCkxwQmlpIemmbZnmBYBMSOFThE-4EfOxGtsuGRQV8m5RuIoxdpsCJ8vGJxMYOtwjmO2Gkp+074RWAkAXW6qSCwijrpupi0pIbZgeIDEKWKzFnqxl42jed6Ps+r6cVK3Eabxs6EQuQksmYIJ6rCtIbp2Fi6NZFSKchqGNOhmFqTKpZ8dpf66cJiCjBYaxgVJYGmFBRjRU497XNcADSIrDqOObjm+XHqd6aW-kRmUsuZqzaGBySapMhilRo5VVSKLEXux163g+T4vsluGaa1fmCUugWDHlsI0tBwG8ocvYnCN1X3NiKFoRhrRYY1nnNalvk6SRenBg2zbhrCOWwkYVlyftFSnQl1xuvUJBNEObS1AAEvNPFKAGGiMnukhSXu2zjCyuqgeBLCDHENJbFF32Hk4f2JRdJBQ95SjQSBph47oag7tsWP1oZRktrqyhbKYcRfXthMaMT53NGTigeZ60OZPEMRzIj-wmCwjZpOqupUiFEK6pzugqPjvPwQLmFk5Iosfi1kvUis4yzHLCto+tbP-ozQU0trSI-U4tVjiQIiwPQ6CMBo6AAGaMAATsgbby6QJonO79Xky1OqrKMBhtgYqiatBnVa8ZYHK1BWOQkN41sfmZNXWLFOZBuFE6lBUHGD1dP1pCFFs6ZDb05Ghf2RNJdMCLRZefHKSUcnuNp9sisZFIIEbuBsJdiqSexgT8Eg2D4Ol0bg+lr6iq-AyTIqMzowUV24LaDMKrGENa+tBDwtbzdeG7-6B+qkf6o5d1CdDOb3OKDfRooM74byYIbAeT9NIvyVAGQ+aNshhl1HuSYJ8dyjC7ueYuTlpquRfJ7b2vswD+yDmAUO4cWCR3khUIujkpouVmu5CBKU8KQmHknaYY91ATzWirfKQU4jRH0INRE+AqAQDgMIKOxAmELQiAAWjMCyORM8hGqLUUI+m+ghouCqOcSAMjxYGWGJCcYWMhE0TmEMJumsNDqBMXEeYQV6ZDV0QwfR75t54SploeYzcoRtg3OIaxIE7H0wcRsExQ1+xYgMRXd61IGx01pObTsowm5J1BBsEM3I9hDUtDEjxkCIg5X0HDds7Ydya0jI2JuIJ1hq2hLCeEUTEL4liS1f8pTBgSSMOwxGk8li5ThFk+EtIwRRjybZNphTmGLTiInWkKgNi6j-roNGhkR6anpljVUMJnZSLKhVI6mJ2mpRxrYrYkw1CwjiBuD+GQoSaFSMsFYGw6LLx1gmYmANnSnLwgZSMtik6GXMpGKSGd9KSQ0DRGi0wuzlIskNPWF0-mLUEdnJZtzrmSFUCyLYpSGzTFXFrKMywAErwTDHVoqLeI51sVGHFSd37ckzqsWeKwDCdhSCjDBDl2I0sQACkJwLFCgokhCjIYEQKq2+OZXxUFAHAIhgKhAOUYhGDiAnCKklFDMxmJk-UsIwxtl2i7PmNDJrORmm5FVeoDAYsCWGfUuL1RSoxkjOVdyvrWCAA */
  context: ({ input }) => input as AblyContext,
  initial: "disconnected",
  states: {
    disconnected: {
      entry: enterDisconnect,
      on: {
        connect: "connected",
      },
    },

    connected: {
      entry: enterConnect,
      on: {
        CREATE: "CREATING",
        JOIN: "JOINING",
      },
    }, // CREATE / JOIN-LOOK

    CREATING: {
      on: {
        CREATED: "CREATED",
      },
    },

    JOINING: {
      on: {
        JOINED: "JOINED",
        JOINED_OBSERVER: "LOOKING",
      },
    },

    CREATED: {
      on: {
        NEXT_ROUND: "NEXT_ROUND",
        TIMEOUT: "TIMEOUT",
        NEXT_ROUND_AVAILABLE: "NEXT_ROUND_AVAILABLE",
        GAME_DATA: "GAME_DATA",
      },
    },

    JOINED: {
      on: {
        NEXT_ROUND: "NEXT_ROUND",
        TIMEOUT: "TIMEOUT",
        NEXT_ROUND_AVAILABLE: "NEXT_ROUND_AVAILABLE",
        GAME_DATA: "GAME_DATA",
      },
    },

    LOOKING: {
      on: {
        TIMEOUT: "TIMEOUT",
        NEXT_ROUND_AVAILABLE: "NEXT_ROUND_AVAILABLE",
        GAME_DATA: "GAME_DATA",
      },
    },

    GAME_OVER: {
      on: {
        REMATCH: "REMATCH",
      },
    },

    GAME_DATA: {
      always: [
        { target: "CREATED", guard: isOwner },
        { target: "JOINED", guard: isPlayer },
        { target: "LOOKING", guard: isObserver },
      ],
    },

    TIMEOUT: {
      after: {
        "5000": "GAME_OVER",
      },
    },

    NEXT_ROUND: {
      always: [{ target: "CREATED", guard: isOwner }, { target: "JOINED" }],
    },

    REMATCH: {
      always: [
        { target: "CREATED", guard: isOwner },
        { target: "JOINED", guard: isPlayer },
        { target: "LOOKING", guard: isObserver },
      ],
    },

    NEXT_ROUND_AVAILABLE: {
      after: {
        "5000": "NEXT_ROUND",
      },
    },
  },
  on: {
    disconnected: ".disconnected",
  },
});

export class AblyHandler {
  socket;
  channel;
  game;
  username: string;
  gameID: string;
  connected: boolean;
  // emitter: Emitter;

  private clientId: string;
  private token: string;
  interpreter;

  constructor(context: AblyContext) {
    this.socket = getSocket();
    this.channel = this.socket.channels.get("game");
    this.game = this.channel;
    // this.emitter = new Emitter();
    this.username = "";
    this.gameID = "";
    this.clientId = "";
    this.connected = false;
    this.token = "";
    this.interpreter = createActor(GameMachine, { input: context });

    this.setConnectionListeners();
  }

  setConnectionListeners() {
    this.socket.connection.on("connecting", () => console.log("[connection] connecting"));

    this.socket.connection.on("disconnected", () => {
      console.log("[connection] disconnected");
      // this.emitter.emit("disconnect");
    });

    this.socket.connection.on("connected", () => {
      this.connected = true;
      this.clientId = this.socket.auth.clientId;
      // @ts-ignore
      this.token = this.socket.auth.tokenDetails.token;
      // this.emitter.emit("connect");
      console.log("[ably] Connected: ", this.socket.auth, this.token);
    });

    this.socket.connection.on("disconnected", st => {
      this.connected = false;
      console.log("[ably] Disconnected", st);
    });

    this.socket.connection.on("closed", st => {
      console.log("[ably]: Closed", st);
    });

    this.socket.connection.on("closing", st => {
      console.log("[ably]: Closing", st);
    });

    this.socket.connection.on("initialized", st => {
      console.log("[ably]: Initialized", st);
    });

    this.socket.connection.on("suspended", st => {
      console.log("[ably]: Suspended", st);
    });

    this.socket.connection.on("failed", err => {
      console.log("[ably]: Error: ", err);
    });
  }

  on(ev: string, callback: (...args: any[]) => void) {
    // this.emitter.on(ev, callback);
  }

  create(username: string, mode: string) {
    this.username = username;

    //   let room: string = res.data.room;
    //   let game: Game = res.data.game;

    //   this.game = this.socket.channels.get(room);
    //   // this.emitter.emit("CREATED", room);
    //   // this.emitter.emit("GAME_DATA", game);
    //   this.gameID = room;

    //   console.log("client_id: ", this.socket.clientId);

    //   this.game.subscribe(ev => {
    //     // this.emitter.emit(ev.name, ev.data);
    //   });
    // })
    createBattle(username, mode, this.token)
      .then(battle => {
        this.gameID = battle.room;
        // this.
      })
      .catch(err => console.log("[createBattle] ERROR: ", err));
  }

  look(gameID: string, username: string) {
    if (!this) console.trace();

    this.gameID = gameID;
    this.username = username;

    lookBattle(gameID, username, this.token)
      .then(({ game }) => {
        // this.game = this.socket.channels.get(gameID);
        // this.game.subscribe(ev => {});
        // this.game.publish("GAME_DATA", game);
      })
      .catch(err => console.log("[lookBattle] ERROR: ", err));
  }

  join(gameID: string, username: string) {
    this.gameID = gameID;
    this.username = username;

    joinBattle(gameID, username, this.token)
      .then(({ game }) => {
        // let game = res.data.game as Game;
        // this.game = this.socket.channels.get(gameID);
        // this.game.subscribe(ev => {
        //   // this.emitter.emit(ev.name, ev.data);
        // });
        // // this.emitter.emit("JOINED");
        // this.game.publish("GAME_DATA", game);
      })
      .catch(err => console.log("[joinBattle] ERROR: ", err));
  }

  time(time: number, round: number) {
    timeBattle(time, this.gameID, round, this.token)
      .then(({ game, stage }) => {
        // this.game.publish("GAME_DATA", game);
        // if (stage === "TIMEOUT") {
        //   this.game.publish("TIMEOUT", {});
        // } else if (stage === "NEXT_ROUND_AVAILABLE") {
        //   this.game.publish("NEXT_ROUND_AVAILABLE", {});
        // }
      })
      .catch(err => console.log("[timeBattle] ERROR: ", err));
  }

  rematch() {
    // this.socket.emit('REMATCH', this.gameID);
  }

  start() {
    startBattle(this.token)
      .then(({ game }) => {
        // this.game.publish("NEXT_ROUND", {});
        // this.game.publish("GAME_DATA", game);
      })
      .catch(err => console.log("[startBattle] ERROR: ", err));
  }

  reconnect(round: number) {
    // this.socket.emit('RECONNECT', this.gameID, this.userID, round);
  }

  gameOver() {
    this.game.publish("GAME_OVER", {});
  }

  nextRound() {
    nextRoundBattle(this.gameID, this.token)
      .then(({ game }) => {
        // this.game.publish("GAME_DATA", game);
        // this.game.publish("NEXT_ROUND", {});
      })
      .catch(err => console.log("[nextRoundBattle] ERROR: ", err));
  }

  exit() {
    disconnectBattle(this.gameID, this.token)
      .then(_ => this.disconnect())
      .catch(err => console.log("[disconnectBattle] ERROR: ", err));
  }

  connect(force = false) {
    if (this.connected && !force) return;

    this.disconnect();
    this.setConnectionListeners();
    this.socket.connect();
  }

  disconnect() {
    this.socket.close();
    this.socket.connection.off();
  }
}
