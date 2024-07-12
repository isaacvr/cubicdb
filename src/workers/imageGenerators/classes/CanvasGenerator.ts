import type { IDrawer } from "../utils";

export class CanvasGenerator implements IDrawer {
  W: number;
  H: number;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(W: number, H: number) {
    this.W = W;
    this.H = H;
    this.canvas = document.createElement("canvas");
    this.canvas.width = W;
    this.canvas.height = H;
    this.ctx = this.canvas.getContext("2d")!;

    this.strokeStyle = "black";
    this.fillStyle = "transparent";
    this.lineWidth = 1;
    this.lineCap = "square";
  }

  set strokeStyle(s: string) {
    this.ctx.strokeStyle = s;
  }

  set fillStyle(s: string) {
    this.ctx.fillStyle = s;
  }

  set lineWidth(lw: CanvasPathDrawingStyles["lineWidth"]) {
    this.ctx.lineWidth = lw;
  }

  set lineCap(lc: CanvasPathDrawingStyles["lineCap"]) {
    this.ctx.lineCap = lc;
  }

  set textAlign(ta: CanvasTextDrawingStyles["textAlign"]) {
    this.ctx.textAlign = ta;
  }

  set textBaseline(tb: CanvasTextDrawingStyles["textBaseline"]) {
    this.ctx.textBaseline = tb;
  }

  set font(f: CanvasTextDrawingStyles["font"]) {
    this.ctx.font = f;
  }

  moveTo(x: number, y: number) {
    this.ctx.moveTo(x, y);
  }

  lineTo(x: number, y: number) {
    this.ctx.lineTo(x, y);
  }

  stroke() {
    this.ctx.stroke();
  }

  beginPath() {
    this.ctx.beginPath();
  }

  fill() {
    this.ctx.fill();
  }

  closePath() {
    this.ctx.closePath();
  }

  getImage() {
    return this.canvas.toDataURL("image/jpg");
  }

  fillText(s: string, x: number, y: number) {
    this.ctx.fillText(s, x, y);
  }

  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, counterclockwise = false) {
    this.ctx.arc(x, y, radius, startAngle, endAngle, counterclockwise);
  }

  setPosition() {}
}
