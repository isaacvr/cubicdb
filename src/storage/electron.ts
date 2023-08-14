import type { CubeEvent, IPC, PDFOptions, Session, Sheet, Solve, Tutorial, UpdateCommand } from "@interfaces";

export class ElectronAdaptor implements IPC {
  private ipc: IPC;
  constructor() {
    this.ipc = (<any> window).electronAPI as IPC;
  }

  handleAlgorithms(fn: Function) {
    this.ipc.handleAlgorithms(fn);
  }

  handleAny(fn: Function) {
    this.ipc.handleAny(fn);
  }

  handleCards(fn: Function) {
    this.ipc.handleCards(fn);
  }

  handleContests(fn: Function) {
    this.ipc.handleContests(fn);
  }

  handleSessions(fn: Function) {
    this.ipc.handleSessions(fn);
  }

  handleSolves(fn: Function) {
    this.ipc.handleSolves(fn);
  }

  handleTutorials(fn: Function) {
    this.ipc.handleTutorials(fn);
  }
  
  handleUpdate(fn: Function) {
    this.ipc.handleUpdate(fn);
  }

  getAlgorithms(dir: string): void {
    this.ipc.getAlgorithms(dir);
  }

  getCards(): void {
    this.ipc.getCards();
  }

  getTutorials() {
    this.ipc.getTutorials();
  }

  addTutorial(t: Tutorial) {
    this.ipc.addTutorial(t);
  }

  updateTutorial(t: Tutorial) {
    this.ipc.updateTutorial(t);
  }

  getSolves() {
    this.ipc.getSolves();
  }

  addSolve(s: Solve) {
    this.ipc.addSolve(s);
  }

  updateSolve(s: Solve) {
    this.ipc.updateSolve(s);
  }

  removeSolves(s: Solve[]) {
    this.ipc.removeSolves(s.map(e => e._id));
  }

  getSessions() {
    this.ipc.getSessions();
  }

  addSession(s: Session) {
    this.ipc.addSession(s);
  }

  removeSession(s: Session) {
    this.ipc.removeSession(s);
  }

  renameSession(s: Session) {
    this.ipc.renameSession(s);
  }

  updateSession(s: Session) {
    this.ipc.updateSession(s);
  }

  addContest(c: CubeEvent) {
    this.ipc.addContest(c);
  }

  getContests() {
    this.ipc.getContests();
  }

  updateContest(c: CubeEvent) {
    this.ipc.updateContest(c);
  }

  removeContests(c: CubeEvent[]) {
    this.ipc.removeContests(c);
  }

  minimize() {
    this.ipc.minimize();
  }

  maximize() {
    this.ipc.maximize();
  }

  close() {
    this.ipc.close();
  }

  generatePDF(args: PDFOptions) {
    this.ipc.generatePDF(args);
  }

  zipPDF(s: { name: string, files: Sheet[]}) {
    this.ipc.zipPDF(s);
  }

  openFile(f: string) {
    this.ipc.openFile(f);
  }

  revealFile(f: string) {
    this.ipc.revealFile(f);
  }

  update(cmd: UpdateCommand) {
    this.ipc.update(cmd);
  }

  sleep(s: boolean) {
    this.ipc.sleep(s);
  }
}