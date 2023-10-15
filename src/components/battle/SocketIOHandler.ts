import { type Socket, io } from "socket.io-client";

export class SocketIOHandler {
  socket: Socket;
  username: string;
  userID: string;
  gameID: string;

  constructor(server: string) {
    this.socket = io(server);
    this.username = '';
    this.userID = '';
    this.gameID = '';
  }

  get connected() {
    return this.socket.connected;
  }

  on(ev: string, callback: (...args: any[]) => void) {
    this.socket.on(ev, callback);
  }

  create(username: string, userID: string) {
    this.username = username;
    this.userID = userID;
    this.socket.emit('CREATE', username, userID);
  }

  look(gameID: string, username: string, userID: string) {
    this.gameID = gameID;
    this.username = username;
    this.userID = userID;
    this.socket.emit('LOOK', gameID, username, userID);
  }

  join(gameID: string, username: string, userID: string) {
    this.gameID = gameID;
    this.username = username;
    this.userID = userID;
    this.socket.emit('JOIN', gameID, username, userID);
  }

  time(time: number, round: number) {
    this.socket.emit(this.gameID, time, round);
  }

  rematch() {
    this.socket.emit('REMATCH', this.gameID);
  }

  start() {
    this.socket.emit('START');
  }

  reconnect(round: number) {
    this.socket.emit('RECONNECT', this.gameID, this.userID, round);
  }

  gameOver() {
    this.socket.emit('GAME_OVER', this.gameID)
  }

  scramble(scramble: string) {
    this.socket.emit('SCRAMBLE', scramble);
  }

  nextRound() {
    this.socket.emit('NEXT_ROUND', this.gameID);
  }

  exit() {
    this.socket.emit('EXIT', this.gameID);
  }

  connect(force = false) {
    if ( this.socket.connected && !force ) return;

    this.socket.disconnect();
    this.socket.connect();
  }

  disconnect() {
    this.socket.disconnect();
  }
}