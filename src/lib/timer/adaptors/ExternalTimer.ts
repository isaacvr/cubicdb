// import { get, writable, type Writable } from 'svelte/store';
// import { TimerState, type InputContext, type TimerInputHandler, Penalty, type Solve } from '@interfaces';
// import { createMachine, interpret, type Sender } from 'xstate';

// interface ExternalTimerContext extends InputContext {
//   leftDown: Writable<boolean>;
//   rightDown: Writable<boolean>;
//   locked: Writable<boolean>;
// }

// const handleDown = (ctx: ExternalTimerContext, ev: any) => {
//   ctx.leftDown.set( ev.hand === 'left' ? true : get(ctx.leftDown) );
//   ctx.rightDown.set( ev.hand === 'right' ? true : get(ctx.rightDown) );
// };

// const handleUp = (ctx: ExternalTimerContext, ev: any) => {
//   ctx.leftDown.set( ev.hand === 'left' ? false : get(ctx.leftDown) );
//   ctx.rightDown.set( ev.hand === 'right' ? false : get(ctx.rightDown) );
//   ctx.locked.set(false);
// };

// const clear = ({ state, time, decimals, ready, stackmatStatus, locked }: ExternalTimerContext) => {
//   stackmatStatus.set(true);
//   state.set(TimerState.CLEAN);
//   time.set(0);
//   decimals.set(true);
//   ready.set(false);
//   locked.set(false);
// }

// const enterDisconnect = ({ state, stackmatStatus }: InputContext) => {
//   stackmatStatus.set(false);
//   state.set(TimerState.CLEAN);
// }

// const setTimerInspection = ({ time, lastSolve, session, addSolve, state, ready, decimals }: InputContext, snd: Sender<any>) => {
//   state.set(TimerState.INSPECTION);
//   ready.set(false);
//   decimals.set(false);

//   let { settings } = get(session);

//   let ref = performance.now() + (settings.hasInspection ? (settings.inspection || 15) * 1000 : 0);
//   let ls = get(lastSolve) as Solve;

//   let itv = setInterval(() => {
//     let t = Math.round((ref - performance.now()) / 1000) * 1000;

//     if (t < -2000) {
//       snd('DNF');
//       lastSolve.set( Object.assign(ls, { penalty: Penalty.DNF }) );
//       addSolve(Infinity, Penalty.DNF);
//       return;
//     }

//     if (t <= 0 && ls?.penalty === Penalty.NONE) {
//       lastSolve.set( Object.assign(ls, { penalty: Penalty.P2 }) );
//     }

//     time.set(~~t);
//   });

//   return () => { clearInterval(itv); };
// }

// const setTimerRunner = ({ decimals, time, lastSolve, state, ready }: InputContext) => {
//   ready.set(false);
//   decimals.set(true);
//   state.set(TimerState.RUNNING);

//   let ref = performance.now() - ( get( lastSolve )?.penalty === Penalty.P2 ? 2000: 0 );
//   let itv = setInterval(() => time.set(performance.now() - ref));

//   return () => {
//     let p = performance.now();
//     clearInterval(itv);
//     time.set(p - ref);
//   };
// }

// const saveSolve = ({ time, state, lastSolve, addSolve, initScrambler }: InputContext) => {
//   state.set(TimerState.STOPPED);
//   initScrambler();

//   let t = get(time);
//   let ls = get(lastSolve) as Solve;

//   t > 0 && addSolve(t, ls?.penalty);
//   time.set(0);
// }

// const handlePenalty = ({ lastSolve, time, handleUpdateSolve }: InputContext, ev: any) => {
//   let ls = get(lastSolve);

//   if ( ls ) {
//     if ( ev.value === Penalty.P2 && ls.penalty != Penalty.P2 ) {
//       ls.time += 2000;
//     } else if ( ev.value !== Penalty.P2 && ls.penalty === Penalty.P2 ) {
//       ls.time -= 2000;
//     }

//     ls.penalty = ev.value;
//     lastSolve.set(ls);
//     time.set( ls.penalty === Penalty.DNF ? Infinity : ls.time );
//     $dataService.solve.updateSolve(ls).then( handleUpdateSolve );
//   }
// };

// const handleDelete = ({ lastSolve, time, reset, handleRemoveSolves }: InputContext) => {
//   let ls = get(lastSolve);

//   if ( ls ) {
//     $dataService.solve.removeSolves([ ls ]).then( handleRemoveSolves );
//     time.set(0);
//     reset();
//   }
// };

// const handleEdit = ({ lastSolve, editSolve }: InputContext) => {
//   let ls = get(lastSolve);

//   if ( ls ) {
//     editSolve( ls );
//   }
// };

// const ExternalMachine = createMachine<ExternalTimerContext, any>({
//   predictableActionArguments: true,
//   initial: 'DISCONNECTED',
//   states: {
//     DISCONNECTED: {
//       entry: enterDisconnect,
//       on: {
//         CONNECT: 'CLEAN',
//       }
//     },

//     CLEAN: {
//       entry: clear,
//       on: {
//         pointerdown: { target: 'INSPECTION', cond: ({ session }) => get(session).settings.hasInspection},
//         RUNNING: 'RUNNING',
//         READY: {
//           actions: [(ctx) => {ctx.ready.set(true); ctx.createNewSolve(); }]
//         },
//       }
//     },

//     INSPECTION: {
//       invoke: {
//         src: (ctx) => (cb) => setTimerInspection(ctx, cb)
//       },
//       on: {
//         DNF: 'STOPPED',
//         RUNNING: 'RUNNING',
//         READY: {
//           actions: [(ctx) => {ctx.ready.set(true); ctx.createNewSolve(); }]
//         },
//       }
//     },

//     RUNNING: {
//       invoke: {
//         src: (ctx) => () => setTimerRunner(ctx),
//       },
//       on: {
//         STOPPED: 'STOPPED',
//       }
//     },

//     STOPPED: {
//       invoke: {
//         src: (ctx) => () => saveSolve(ctx)
//       },
//       on: {
//         CLEAN: 'CLEAN',
//         pointerdown: 'INSPECTION',
//         penalty: { actions: [ handlePenalty ] },
//         delete: { actions: [ handleDelete ] },
//         edit: { actions: [ handleEdit ] },
//       }
//     }
//   },
//   on: {
//     DISCONNECTED: 'DISCONNECTED',
//     reset: 'CLEAN',
//   }
// });

// export class ExternalTimerInput implements TimerInputHandler {
//   private interpreter;
//   private cb: any;
//   private ctx: ExternalTimerContext;
//   private deviceId: string;
//   isActive: boolean;

//   constructor(context: InputContext) {
//     this.ctx = {
//       ...context,
//       leftDown: writable(false),
//       rightDown: writable(false),
//       locked: writable(false)
//     };

//     this.interpreter = interpret(ExternalMachine.withContext(this.ctx));
//     this.interpreter.onTransition((state) => {
//       console.log("STATE: ", state.value);
//     });

//     this.isActive = false;
//     this.deviceId = '';

//     console.log("[external]: constructor");
//   }

//   init() {
//     console.log("[external]: init");
//     this.isActive = true;

//     this.disconnect();
//     this.interpreter = interpret(ExternalMachine.withContext(this.ctx));
//     this.interpreter.onTransition((state) => {
//       console.log("STATE: ", state.value);
//     });
//     this.interpreter.start();

//     this.cb = (data: any) => this.setExternalConnection(data);
//     $dataService.on('external', this.cb);
//   }

//   disconnect() {
//     console.log("[external]: disconnect");
//     this.isActive = false;
//     this.interpreter.stop();
//     $dataService.off('external', this.cb);
//   }

//   private setExternalConnection(ev: any) {
//     let id = ev[0];
//     let data = ev[3];

//     if ( this.deviceId != id ) return;

//     // if ( data.type === 'state' ) {
//     //   console.log("[STATE]: ", data);
//     //   this.interpreter.send({ type: data.state });
//     // } else {
//       console.log('[EVENT]: ', data);
//       this.interpreter.send(data);
//     // }
//   }

//   keyUpHandler(ev: KeyboardEvent) {
//     if (!this.isActive) return;
//     this.interpreter.send(ev);
//   }

//   keyDownHandler(ev: KeyboardEvent) {
//     if (!this.isActive) return;
//     this.interpreter.send(ev);
//   }

//   stopTimer() {
//     this.interpreter.send({ type: 'keydown', code: 'Escape' });
//   }

//   setExternal(id: string) {
//     this.deviceId = id;
//     this.interpreter.send('CONNECT');
//   }

//   newRecord() {
//     $dataService.external(this.deviceId, { type: 'new-record' });
//   }
// }
