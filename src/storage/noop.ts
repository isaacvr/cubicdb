import type { CubeEvent, IPC, PDFOptions, Session, Sheet, Solve, Tutorial, UpdateCommand } from "@interfaces";

export class NoopAdaptor implements IPC {
  handleAlgorithms(fn: Function) {}
  handleAny(fn: Function) {}
  handleCards(fn: Function) {}
  handleContests(fn: Function) {}
  handleSessions(fn: Function) {}
  handleSolves(fn: Function) {}
  handleTutorials(fn: Function) {}
  handleUpdate(fn: Function) {}
  
  getAlgorithms(dir: string): void {}
  getCards(): void {}
  
  getTutorials() {}
  addTutorial(t: Tutorial) {}
  updateTutorial(t: Tutorial) {}
  
  getSolves() {}
  addSolve(s: Solve) {}
  updateSolve(s: Solve) {}
  removeSolves(s: Solve[]) {}
  
  getSessions() {}
  addSession(s: Session) {}
  removeSession(s: Session) {}
  renameSession(s: Session) {}
  updateSession(s: Session) {}
  
  addContest(c: CubeEvent) {}
  getContests() {}
  updateContest(c: CubeEvent) {}
  removeContests(c: CubeEvent[]) {}

  minimize() {}
  maximize() {}
  close() {}

  generatePDF(args: PDFOptions) {}
  zipPDF(s: { name: string, files: Sheet[]}) {}
  openFile(f: string) {}
  revealFile(f: string) {}

  update(cmd: UpdateCommand) {}

  sleep(s: boolean) {}
}