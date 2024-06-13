import { EPS } from "@constants";
import type { IDrawer } from "../utils";

interface IElement {
  type: "path" | "text";
  fill: boolean;
  stroke: boolean;
  path: string;
  strokeStyle: string;
  fillStyle: string;
  lineWidth: CanvasPathDrawingStyles["lineWidth"];
  lineCap: CanvasPathDrawingStyles["lineCap"];
  textAlign: CanvasTextDrawingStyles["textAlign"];
  textBaseline: CanvasTextDrawingStyles["textBaseline"];
  font: CanvasTextDrawingStyles["font"];
  position: number;
  content: string;
  x: number;
  y: number;
}

export class SVGGenerator implements IDrawer {
  strokeStyle: string;
  fillStyle: string;
  lineWidth: CanvasPathDrawingStyles["lineWidth"];
  lineCap: CanvasPathDrawingStyles["lineCap"];
  textAlign: CanvasTextDrawingStyles["textAlign"];
  textBaseline: CanvasTextDrawingStyles["textBaseline"];
  font: CanvasTextDrawingStyles["font"];

  elements: IElement[];

  W: number;
  H: number;

  private _cursor: number;

  constructor(W: number, H: number) {
    this.W = W;
    this.H = H;
    this._cursor = 0;
    this.strokeStyle = "black";
    this.fillStyle = "transparent";
    this.lineWidth = 1;
    this.lineCap = "square";
    this.elements = [];
    this.textAlign = "start";
    this.textBaseline = "alphabetic";
    this.font = "10px sans-serif";
  }

  moveTo(x: number, y: number) {
    this.elements[this._cursor].path += `M${x},${y}`;
  }

  lineTo(x: number, y: number) {
    this.elements[this._cursor].path += `L${x},${y}`;
  }

  stroke() {
    this.elements[this._cursor].stroke = true;
  }

  beginPath() {
    this.elements.push({
      type: "path",
      fill: false,
      stroke: true,
      path: "",
      fillStyle: this.fillStyle,
      lineCap: this.lineCap,
      lineWidth: this.lineWidth,
      strokeStyle: this.strokeStyle,
      font: "",
      textAlign: "start",
      textBaseline: "alphabetic",
      position: -1,
      content: "",
      x: 0,
      y: 0,
    });

    this._cursor = this.elements.length - 1;
  }

  fill() {
    this.elements[this._cursor].fill = true;
  }

  closePath() {
    this.elements[this._cursor].path += `Z`;
  }

  private getNodeStr(node: IElement) {
    switch (node.type) {
      case "path": {
        return `<path ${node.position >= 0 ? 'data-position="' + node.position + '"' : ""} fill="${
          node.fill ? node.fillStyle : "none"
        }" stroke="${node.stroke ? node.strokeStyle : "none"}" stroke-width="${
          node.lineWidth
        }" stroke-linecap="${node.lineCap}" d="${node.path}" />`;
      }

      case "text": {
        return `<text x="${node.x}" y="${node.y}" font-size="${node.font.slice(
          0,
          node.font.indexOf("px")
        )}" alignment-baseline="${node.textBaseline}" fill="${
          node.fillStyle
        }" font-family="${node.font.slice(node.font.indexOf("px") + 3)}" text-anchor="${
          node.textAlign === "center" ? "middle" : "start"
        }">${node.content}</text>`;
      }
    }
  }

  getImage() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
    <svg xmlns="http://www.w3.org/2000/svg" x="0" y="0" width="${this.W}"
      height="${this.H}" viewBox="0 0 ${this.W} ${this.H}">
      ${this.elements.map(e => this.getNodeStr(e)).join("\n")}
    </svg>`;
  }

  setPosition(p: number) {
    this.elements[this._cursor].position = p;
  }

  fillText(s: string, x: number, y: number) {
    this.elements.push({
      type: "text",
      fill: true,
      stroke: false,
      path: "",
      fillStyle: this.fillStyle,
      lineCap: this.lineCap,
      lineWidth: this.lineWidth,
      strokeStyle: this.strokeStyle,
      textAlign: this.textAlign,
      textBaseline: this.textBaseline,
      font: this.font,
      position: -1,
      content: s,
      x,
      y,
    });

    this._cursor = this.elements.length - 1;
  }

  arc(
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    counterclockwise = false
  ) {
    const startX = x + radius * Math.cos(startAngle);
    const startY = y + radius * Math.sin(startAngle);
    const endX = x + radius * Math.cos(endAngle);
    const endY = y + radius * Math.sin(endAngle);

    const largeArcFlag = endAngle - startAngle <= Math.PI ? 0 : 1;
    const sweepFlag = counterclockwise ? 0 : 1;

    if (Math.abs((startAngle - endAngle) % (Math.PI * 2)) < EPS) {
      const startX = x + radius;
      const startY = y;

      // Dos arcos para hacer un círculo completo
      const arc1 = `A ${radius} ${radius} 0 1 0 ${x - radius} ${y}`;
      const arc2 = `A ${radius} ${radius} 0 1 0 ${startX} ${startY}`;

      this.elements[this._cursor].path += `M ${startX} ${startY} ${arc1} ${arc2}`;
    } else {
      this.elements[
        this._cursor
      ].path += `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${endX} ${endY}`;
    }
  }
}
