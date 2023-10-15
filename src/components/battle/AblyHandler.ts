import { Emitter } from '@classes/Emitter';
import type { Game } from '@interfaces';
import { Realtime } from 'ably';
import axios from 'axios';

const SERVER = `http://localhost:3000`;

export class AblyHandler {
  socket;
  channel;
  game;
  username: string;
  userID: string;
  gameID: string;
  connected: boolean;
  emitter: Emitter;

  private clientId: string;
  private token: string;

  constructor() {
    this.socket = new Realtime({ authUrl: SERVER + '/auth', autoConnect: true });
    this.channel = this.socket.channels.get('game');
    this.game = this.channel;
    this.emitter = new Emitter();
    this.username = '';
    this.userID = '';
    this.gameID = '';
    this.clientId = '';
    this.connected = false;
    this.token = '';

    this.setConnectionListeners();
  }

  setConnectionListeners() {
    this.socket.connection.on('closed', () => console.log('[connection] closed'));
    this.socket.connection.on('closing', () => console.log('[connection] closing'));
    this.socket.connection.on('connected', () => {
      console.log('[connection] connected');
      this.emitter.emit('connect');
    });
    this.socket.connection.on('connecting', () => console.log('[connection] connecting'));
    this.socket.connection.on('disconnected', () => {
      console.log('[connection] disconnected');
      this.emitter.emit('disconnect');
    });
    this.socket.connection.on('failed', () => console.log('[connection] failed'));
    this.socket.connection.on('initialized', () => console.log('[connection] initialized'));
    this.socket.connection.on('suspended', () => console.log('[connection] suspended'));
    this.socket.connection.on('update', () => console.log('[connection] update'));

    this.socket.connection.on('connected', () => {
    // this.socket.connection.on('connected', () => {
      this.connected = true;
      this.clientId = this.socket.auth.clientId;
      // @ts-ignore
      this.token = this.socket.auth.tokenDetails.token;
      console.log("[ably] Connected: ", this.socket.auth, this.token);
    });

    this.socket.connection.on('disconnected', () => {
      this.connected = false;
      console.log("[ably] Disconnected");
    });
  }

  on(ev: string, callback: (...args: any[]) => void) {
    this.emitter.on(ev, callback);
  }

  create(username: string, userID: string) {
    this.username = username;
    this.userID = userID;
    
    axios.get(SERVER + `/create/${username}/${userID}`, {
      headers: { Authorization: 'Bearer ' + this.token }
    }).then(res => {
      let room: string = res.data.room;
      let game: Game = res.data.game;
      
      console.log("res: ", room, game);

      this.game = this.socket.channels.get( room );
      this.emitter.emit('CREATED', room);
      this.emitter.emit('GAME_DATA', game);

      this.game.subscribe(ev => {
        console.log('EVENT: ', ev);
        this.emitter.emit(ev.name, ev.data);
      });
      
    }).catch((err) => console.log('[axios] ERROR: ', err));
  }

  look(gameID: string, username: string, userID: string) {
    console.log('[looking]: ', this, gameID, username, userID);
    if ( !this ) console.trace();

    this.gameID = gameID;
    this.username = username;
    this.userID = userID;

    axios.get(SERVER + `/observer/${gameID}/${username}/${userID}`, {
      headers: { Authorization: 'Bearer ' + this.token }
    }).then(res => {
      let game = res.data.game;

      console.log('JOINED: ', game);

      this.game = this.socket.channels.get( gameID );
      this.emitter.emit('LOOKING');
      this.emitter.emit('GAME_DATA', game);

      this.game.subscribe(ev => {
        console.log('EVENT: ', ev);
        this.emitter.emit(ev.name, ev.data);
      });

      this.game.publish('GAME_DATA', game);
      
    }).catch((err) => console.log('[axios] ERROR: ', err));
  }

  join(gameID: string, username: string, userID: string) {
    console.log('[joining]: ', this, gameID, username, userID);
    if ( !this ) console.trace();

    this.gameID = gameID;
    this.username = username;
    this.userID = userID;

    axios.get(SERVER + `/join/${gameID}/${username}/${userID}`, {
      headers: { Authorization: 'Bearer ' + this.token }
    }).then(res => {
      let game = res.data.game;

      console.log('JOINED: ', game);

      this.game = this.socket.channels.get( gameID );
      this.emitter.emit('JOINED');
      this.emitter.emit('GAME_DATA', game);

      this.game.subscribe(ev => {
        console.log('EVENT: ', ev);
        this.emitter.emit(ev.name, ev.data);
      });

      this.game.publish('GAME_DATA', game);
      
    }).catch((err) => console.log('[axios] ERROR: ', err));

    // this.game.publish('DATA', { str: 'HOLA' });
    // this.socket.emit('JOIN', gameID, username, userID);
  }

  time(time: number, round: number) {
    // this.socket.emit(this.gameID, time, round);
  }

  rematch() {
    // this.socket.emit('REMATCH', this.gameID);
  }

  start() {
    // this.socket.emit('START');
  }

  reconnect(round: number) {
    // this.socket.emit('RECONNECT', this.gameID, this.userID, round);
  }

  gameOver() {
    // this.socket.emit('GAME_OVER', this.gameID)
  }

  scramble(scramble: string) {
    // this.socket.emit('SCRAMBLE', scramble);
  }

  nextRound() {
    // this.socket.emit('NEXT_ROUND', this.gameID);
  }

  exit() {
    // this.socket.emit('EXIT', this.gameID);
  }

  connect(force = false) {
    if ( this.connected && !force ) return;

    this.disconnect();
    this.setConnectionListeners();
    this.socket.connect();
  }

  disconnect() {
    this.socket.close();
    this.socket.connection.off();
  }
}